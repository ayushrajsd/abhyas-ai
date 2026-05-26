import type { SupabaseClient } from '@supabase/supabase-js'

export type CompleteTaskResult =
  | { outcome: 'next_task';       taskId: string; milestoneId: string }
  | { outcome: 'next_milestone';  milestoneId: string; projectId: string }
  | { outcome: 'project_complete'; projectId: string }

export async function handleCompleteTask(
  db: SupabaseClient,
  taskId: string,
  userId: string,
): Promise<CompleteTaskResult> {
  // Fetch the task being completed (verify ownership via milestone → project chain)
  const { data: task, error: taskError } = await db
    .from('tasks')
    .select(`
      id, order_index, milestone_id, status,
      milestones!inner (
        id, order_index, project_id, status,
        projects!inner ( id, user_id, status )
      )
    `)
    .eq('id', taskId)
    .single()

  if (taskError || !task) throw new Error('Task not found')

    // the below checks are not for one to many checks but for run time type checks
  const milestone = Array.isArray(task.milestones) ? task.milestones[0] : task.milestones
  const project = Array.isArray(milestone.projects) ? milestone.projects[0] : milestone.projects

  if (project.user_id !== userId) throw new Error('Unauthorized')
  if (task.status === 'done') {
    // Already done — return current state without erroring
    const { data: nextTask } = await db
      .from('tasks')
      .select('id')
      .eq('milestone_id', milestone.id)
      .eq('status', 'active')
      .order('order_index', { ascending: true })
      .limit(1)
      .single()

    if (nextTask) return { outcome: 'next_task', taskId: nextTask.id, milestoneId: milestone.id }
    return { outcome: 'next_milestone', milestoneId: milestone.id, projectId: project.id }
  }

  // Mark current task done
  await db.from('tasks').update({ status: 'done' }).eq('id', taskId)

  // Find next task in same milestone (strictly by order_index)
  const { data: nextTask } = await db
    .from('tasks')
    .select('id, order_index')
    .eq('milestone_id', milestone.id)
    .eq('status', 'locked')
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (nextTask) {
    await db.from('tasks').update({ status: 'active' }).eq('id', nextTask.id)
    return { outcome: 'next_task', taskId: nextTask.id, milestoneId: milestone.id as string }
  }

  // No next task — milestone is complete
  await db.from('milestones').update({ status: 'complete' }).eq('id', milestone.id)

  // Find next milestone in same project (by order_index)
  const { data: nextMilestone } = await db
    .from('milestones')
    .select('id, order_index')
    .eq('project_id', project.id)
    .eq('status', 'locked')
    .order('order_index', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (nextMilestone) {
    await db.from('milestones').update({ status: 'active' }).eq('id', nextMilestone.id)
    return { outcome: 'next_milestone', milestoneId: nextMilestone.id as string, projectId: project.id as string }
  }

  // No next milestone — project complete
  await db.from('projects').update({ status: 'complete' }).eq('id', project.id)
  return { outcome: 'project_complete', projectId: project.id as string }
}
