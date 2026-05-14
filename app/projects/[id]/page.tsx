// STUB — replaced in Phase 4 (Agent 2 + Milestone Roadmap)

export default function ProjectPage({ params }: { params: { id: string } }) {
  return (
    <main
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#f7f4ef', color: '#1c1c1c' }}
    >
      <div className="text-center space-y-2">
        <p className="font-serif text-lg font-semibold">Project saved.</p>
        <p className="text-sm" style={{ color: '#6b6b6b' }}>
          Milestone roadmap coming in Phase 4. (ID: {params.id})
        </p>
      </div>
    </main>
  )
}
