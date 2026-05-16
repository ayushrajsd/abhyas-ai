import { notFound, redirect } from 'next/navigation'
import { createAuthClient } from '@/lib/supabase'
import { getProjectWithMilestones } from '@/actions/agents'
import { MilestoneRoadmap } from '@/components/abhyas/MilestoneRoadmap'
import { MilestoneGenerator } from '@/components/abhyas/MilestoneGenerator'
import { MobileHelpBanner, DesktopHelpSidebar } from '@/components/abhyas/ProjectHelpSidebar'

const COMPLEXITY_STYLES = {
  beginner:     { bg: '#f0f7f3', text: '#3d6b4f', border: '#b8d9c5', label: 'Beginner' },
  intermediate: { bg: '#fefce8', text: '#854d0e', border: '#fde68a', label: 'Intermediate' },
  challenging:  { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', label: 'Challenging' },
} as const

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/dashboard')

  const result = await getProjectWithMilestones(params.id)
  if (!result) notFound()

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { project, milestones } = result!
  const badge = COMPLEXITY_STYLES[project.complexity as keyof typeof COMPLEXITY_STYLES]
  const milestonesLoaded = milestones.length > 0

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: '#f7f4ef', color: '#1c1c1c' }}
    >
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Back link */}
        <a
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm mb-8 transition-opacity hover:opacity-70"
          style={{ color: '#6b6b6b' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Dashboard
        </a>

        <div className="flex gap-10 items-start">

          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-8">

            {/* Help banner on mobile — only after milestones load */}
            {milestonesLoaded && <MobileHelpBanner />}

            {/* Project header */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {badge && (
                  <span
                    className="text-xs font-semibold px-3 py-1 rounded-full border"
                    style={{ backgroundColor: badge.bg, color: badge.text, borderColor: badge.border }}
                  >
                    {badge.label}
                  </span>
                )}
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9b9b9b' }}>
                  {project.topic}
                </span>
              </div>
              <h1 className="font-serif text-2xl font-semibold leading-snug" style={{ color: '#1c1c1c' }}>
                {project.title}
              </h1>
              <p className="text-sm leading-relaxed" style={{ color: '#4b4b4b', lineHeight: '1.7', maxWidth: '56ch' }}>
                {project.description}
              </p>
            </div>

            {/* Roadmap */}
            <div className="space-y-4">
              <div className="pb-3" style={{ borderBottom: '1px solid #e8e3da' }}>
                <h2 className="font-serif text-base font-semibold" style={{ color: '#1c1c1c' }}>
                  Your roadmap
                </h2>
                <p className="text-xs mt-0.5" style={{ color: '#9b9b9b' }}>
                  Complete milestones in order. Each one ends with something you can verify.
                </p>
              </div>

              {milestonesLoaded ? (
                <MilestoneRoadmap milestones={milestones} projectId={params.id} />
              ) : (
                <MilestoneGenerator projectId={params.id} />
              )}
            </div>

          </div>

          {/* Desktop sidebar — only after milestones load so context makes sense */}
          {milestonesLoaded && <DesktopHelpSidebar />}

        </div>
      </div>
    </main>
  )
}
