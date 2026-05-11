import { createAuthClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import GitHubSignInButton from '@/components/abhyas/GitHubSignInButton'

export default async function LandingPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const supabase = createAuthClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('encrypted_api_key')
      .eq('id', session.user.id)
      .single()
    redirect(user?.encrypted_api_key ? '/dashboard' : '/onboarding')
  }

  return (
    <div style={{ backgroundColor: '#f7f4ef', color: '#1c1c1c' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #ddd8cf' }} className="flex items-center justify-between px-8 py-5">
        <span className="font-serif text-lg font-semibold">
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span>
        </span>
        <a href="https://tapovan.ai" className="text-sm" style={{ color: '#6b6b6b' }}>
          Tapovan.ai
        </a>
      </nav>

      {/* 1. HERO */}
      <section className="max-w-4xl mx-auto px-8 py-28 text-center space-y-8">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3d6b4f' }}>
          For developers who want to actually get good
        </p>
        <h1 className="font-serif font-bold leading-tight" style={{ fontSize: '3.75rem' }}>
          AI won't make you a better developer.<br />
          <span style={{ color: '#3d6b4f' }}>Building will.</span>
        </h1>
        <p className="text-xl leading-relaxed max-w-2xl mx-auto" style={{ color: '#6b6b6b' }}>
          You wouldn't ask a personal trainer to lift the weights for you.
          Abhyas is your AI-powered training ground. Real projects, real problems,
          real growth. You do the reps.
        </p>
        <div className="flex flex-col items-center gap-3 pt-2">
          {searchParams.error && (
            <p className="text-sm rounded-lg px-4 py-3" style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
              Authentication failed. Please try again.
            </p>
          )}
          <GitHubSignInButton />
          <p className="text-xs" style={{ color: '#9b9b9b' }}>Free to start · Bring your own API key</p>
        </div>
      </section>

      {/* 2. THE GYM METAPHOR */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #ddd8cf', borderBottom: '1px solid #ddd8cf' }}>
        <div className="max-w-4xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <h2 className="font-serif text-3xl font-bold">
              Copying AI output is the developer equivalent of watching gym videos from the couch.
            </h2>
            <p className="leading-relaxed" style={{ color: '#6b6b6b' }}>
              You feel productive. Nothing is actually happening.
              The gap between developers who use AI and developers who understand it
              is widening every month. One group is getting stronger. The other is getting dependent.
            </p>
            <p className="leading-relaxed font-medium" style={{ color: '#1c1c1c' }}>
              Abhyas puts you in the group that's getting stronger.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { a: 'Copy AI output', b: "Understand what you're building" },
              { a: 'Watch tutorials', b: 'Finish a real project' },
              { a: 'Ask AI to fix bugs', b: 'Learn why the bug happened' },
              { a: 'Follow along', b: 'Work through it yourself' },
            ].map((row) => (
              <div key={row.a} className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg px-4 py-3 text-center line-through" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                  {row.a}
                </div>
                <div className="rounded-lg px-4 py-3 text-center font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                  {row.b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-8 py-24 space-y-16">
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>How it works</p>
          <h2 className="font-serif text-3xl font-bold">Pick a topic. Get a project. Ship it.</h2>
          <p className="max-w-lg mx-auto" style={{ color: '#6b6b6b' }}>
            No courses. No videos. No hand-holding. Just a well-scoped project, a clear path, and a nudge when you need one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Choose your starting point',
              desc: "Tell Abhyas what you want to build and where you're starting from. Beginner, intermediate, or advanced. You get a project scoped to your level, not a watered-down version of someone else's.",
            },
            {
              step: '02',
              title: 'Get a problem to solve',
              desc: 'You get a real problem statement, broken into milestones you can actually finish. Each milestone ends with something testable, not a vague "good job."',
            },
            {
              step: '03',
              title: 'Build on your machine',
              desc: "You set up the stack, hit real errors, and fix them. When you're genuinely stuck, ask for a nudge. You get a direction, never the solution. Your repo, your code, your understanding.",
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl p-7 space-y-4" style={{ backgroundColor: '#ffffff', border: '1px solid #ddd8cf' }}>
              <span className="font-mono text-sm font-bold" style={{ color: '#3d6b4f' }}>{item.step}</span>
              <p className="font-serif font-semibold text-xl">{item.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. THREE LEVELS */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #ddd8cf', borderBottom: '1px solid #ddd8cf' }}>
        <div className="max-w-4xl mx-auto px-8 py-20 space-y-14">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>Three levels, any topic</p>
            <h2 className="font-serif text-3xl font-bold">A project shaped around where you actually are.</h2>
            <p style={{ color: '#6b6b6b' }}>
              Same topic, three different entry points. You pick the one that challenges you without breaking you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                level: 'Beginner',
                badge: '#d1fae5',
                badgeText: '#065f46',
                promise: 'Get your first real project shipped',
                what: "Clear problem statement. Guided milestones. Concepts introduced one at a time. You'll build something that works and understand why it works.",
              },
              {
                level: 'Intermediate',
                badge: '#fef3c7',
                badgeText: '#92400e',
                promise: "Go deeper than you've gone before",
                what: "Fewer guardrails. More ambiguity. The problem statement is real, the path to the solution is yours to find. You'll hit walls. That's the point.",
              },
              {
                level: 'Advanced',
                badge: '#ede9fe',
                badgeText: '#5b21b6',
                promise: "Build something you'd actually show in an interview",
                what: 'Open-ended problem. Production considerations. You make the architectural calls. The AI challenges your decisions, not just your implementation.',
              },
            ].map((p) => (
              <div key={p.level} className="rounded-xl p-6 space-y-4" style={{ backgroundColor: '#f7f4ef', border: '1px solid #ddd8cf' }}>
                <span className="inline-block text-xs font-bold tracking-widest px-3 py-1 rounded-full" style={{ backgroundColor: p.badge, color: p.badgeText }}>
                  {p.level}
                </span>
                <p className="font-serif font-semibold text-lg">{p.promise}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{p.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. THE NUDGE */}
      <section className="max-w-3xl mx-auto px-8 py-24 text-center space-y-6">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>When you're stuck</p>
        <h2 className="font-serif text-3xl font-bold">
          Help is always there.<br />The solution never is.
        </h2>
        <p className="text-lg leading-relaxed" style={{ color: '#6b6b6b' }}>
          Ask for a nudge and you get a reframe, a direction, or a concrete pointer, whichever level you need.
          The AI will ask clarifying questions, challenge your assumptions, and point you at the right door.
          It will never open it for you.
        </p>
        <p className="font-serif italic text-lg" style={{ color: '#9b9b9b' }}>
          The answer, when it arrives, arrives in your hands.<br />Because of that, it stays.
        </p>
      </section>

      {/* 6. CTA */}
      <section style={{ backgroundColor: '#3d6b4f' }} className="px-8 py-20">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl font-bold" style={{ color: '#ffffff' }}>
            Pick a topic. Start today.
          </h2>
          <p style={{ color: '#a7c4b0' }}>
            No cohort. No schedule. No one waiting on you.<br />
            Just you, a real problem, and the habit of actually finishing things.
          </p>
          <div className="flex flex-col items-center gap-3">
            <GitHubSignInButton variant="light" />
            <p className="text-xs" style={{ color: '#7aab8a' }}>
              Free to start · Bring your own API key · Runs on your machine
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #ddd8cf', backgroundColor: '#f7f4ef' }} className="px-8 py-6 flex items-center justify-between">
        <span className="font-serif text-sm" style={{ color: '#9b9b9b' }}>
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span> · part of <a href="https://tapovan.ai" style={{ color: '#3d6b4f' }}>Tapovan.ai</a>
        </span>
        <span className="font-serif text-xs italic" style={{ color: '#b5b0a5' }}>
          अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते
        </span>
      </footer>

    </div>
  )
}
