import { notFound, redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase'
import { getMilestoneWithTasks } from '@/actions/agents'
import { WarmupShelf, SetupChecklist } from '@/components/abhyas/MilestoneRoadmap'
import { TaskList } from '@/components/abhyas/TaskList'
import { TaskGenerator } from '@/components/abhyas/TaskGenerator'

const COMPLEXITY_STYLES = {
  beginner:     { bg: '#f0f7f3', text: '#3d6b4f', border: '#b8d9c5', label: 'Beginner' },
  intermediate: { bg: '#fefce8', text: '#854d0e', border: '#fde68a', label: 'Intermediate' },
  challenging:  { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'Challenging' },
} as const

export default async function MilestonePage({
  params,
}: {
  params: { id: string; milestoneId: string }
}) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/dashboard')

  const result = await getMilestoneWithTasks(params.milestoneId)
  if (!result) notFound()

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { milestone, project, tasks, allMilestones } = result!

  // Verify this milestone belongs to the expected project
  if (milestone.project_id !== params.id) notFound()

  const milestoneNumber = (allMilestones as Array<{ id: string }>).findIndex(m => m.id === params.milestoneId) + 1
  const totalMilestones = allMilestones.length
  const badge = COMPLEXITY_STYLES[project.complexity as keyof typeof COMPLEXITY_STYLES]
  const tasksLoaded = tasks.length > 0
  const anyTaskDone = (tasks as Array<{ status: string }>).some(t => t.status === 'done')

  return (
    <main className="min-h-screen" style={{ backgroundColor: '#f7f4ef', color: '#1c1c1c' }}>
      <div className="max-w-3xl mx-auto px-4 py-10">

        {/* Back link */}
        <a
          href={`/projects/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-opacity hover:opacity-70"
          style={{ color: '#6b6b6b' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to roadmap
        </a>

        {/* Milestone header */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3 flex-wrap">
            {badge && (
              <span
                className="text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
              >
                {badge.label}
              </span>
            )}
            <span className="text-xs font-medium" style={{ color: '#9b9b9b' }}>
              Milestone {milestoneNumber} of {totalMilestones}
            </span>
            {milestone.status === 'complete' && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#f0f7f3', color: '#3d6b4f', border: '1px solid #b8d9c5' }}
              >
                Complete ✓
              </span>
            )}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ color: '#9b9b9b' }}>
              {project.topic}
            </p>
            <h1 className="font-serif text-2xl font-semibold leading-snug" style={{ color: '#1c1c1c' }}>
              {milestone.title}
            </h1>
          </div>

          <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b', lineHeight: '1.75', maxWidth: '60ch' }}>
            {milestone.description}
          </p>

          {/* Learning objectives */}
          {milestone.learning_objectives?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b6b6b' }}>
                By the end of this milestone
              </p>
              <ul className="space-y-1">
                {milestone.learning_objectives.map((obj: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#4b4b4b' }}>
                    <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full" style={{ backgroundColor: '#c8a96e' }} />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Warm-up shelf — collapses once learner has done at least one task */}
        {milestone.warmup_resources?.length > 0 && (
          <div className="mb-6">
            <WarmupShelf
              resources={milestone.warmup_resources}
              startCollapsed={anyTaskDone}
            />
          </div>
        )}

        {/* Setup checklist — Milestone 1 only */}
        {milestone.setup_checklist && milestone.setup_checklist.length > 0 && (
          <div
            className="rounded-xl p-5 mb-6"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e8e3da' }}
          >
            <SetupChecklist items={milestone.setup_checklist} />
          </div>
        )}

        {/* Tasks section */}
        <div className="space-y-4">
          <div className="pb-3" style={{ borderBottom: '1px solid #e8e3da' }}>
            <h2 className="font-serif text-base font-semibold" style={{ color: '#1c1c1c' }}>
              Tasks
            </h2>
            {tasksLoaded && (
              <p className="text-xs mt-0.5" style={{ color: '#9b9b9b' }}>
                Complete tasks in order. Mark each done when you meet the stated criterion.
              </p>
            )}
          </div>

          {tasksLoaded ? (
            <TaskList
              tasks={tasks}
              milestoneId={params.milestoneId}
              projectId={params.id}
            />
          ) : (
            <TaskGenerator milestoneId={params.milestoneId} />
          )}
        </div>

      </div>
    </main>
  )
}
