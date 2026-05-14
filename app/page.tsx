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

      {/* Thin accent bar */}
      <div style={{ height: 3, background: 'linear-gradient(90deg, #3d6b4f 0%, #7ab394 60%, #f7f4ef 100%)' }} />

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #e8e3da' }} className="flex items-center justify-between px-8 py-5">
        <span className="font-serif text-lg font-semibold">
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span>
        </span>
        <a href="https://tapovan.ai" className="text-sm" style={{ color: '#9b9b9b' }}>
          A Tapovan project
        </a>
      </nav>

      {/* 1. HERO */}
      <section
        className="px-8 py-28 text-center"
        style={{ background: 'linear-gradient(180deg, #eef6f1 0%, #f7f4ef 100%)', borderBottom: '1px solid #e8e3da' }}
      >
        <div className="max-w-3xl mx-auto space-y-7">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3d6b4f' }}>
            For developers who build to understand
          </p>
          <h1 className="font-serif font-bold leading-tight" style={{ fontSize: '3rem' }}>
            There is a difference between using AI
            <br />and understanding it.
          </h1>
          <p className="font-serif text-xl font-medium" style={{ color: '#3d6b4f' }}>
            Abhyas is for the second kind.
          </p>
          <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: '#6b6b6b' }}>
            Real projects, on your own machine. A clear path forward.
            The next nudge when you need it. Never the answer itself.
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
        </div>
      </section>

      {/* 2. THE INSIGHT */}
      <section style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e8e3da' }}>
        <div className="max-w-3xl mx-auto px-8 py-24 space-y-10 text-center">
          <h2 className="font-serif text-3xl font-bold leading-snug">
            The gym did not disappear when cars were invented.
          </h2>
          <div className="space-y-4 text-base leading-relaxed max-w-2xl mx-auto" style={{ color: '#4b4b4b' }}>
            <p>
              You run not to get somewhere faster. You run to stay capable.
            </p>
            <p>
              AI can write the code. It builds at a speed you could not match alone.
              That changes what you can ship. It does not change what you understand.
            </p>
            <p style={{ color: '#1c1c1c', fontWeight: 500 }}>
              The developer who builds through confusion — who hits the error,
              reads the docs, tries again — is learning something the other one is not.
            </p>
            <p>
              Abhyas creates that space.
            </p>
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-8 py-24 space-y-14">
        <div className="text-center space-y-3">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>How it works</p>
          <h2 className="font-serif text-3xl font-bold">One project. One milestone at a time.</h2>
          <p className="max-w-lg mx-auto text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>
            No courses. No videos. A well-scoped project, a clear path, and a nudge when you need one.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Choose your starting point',
              desc: 'Tell Abhyas what you want to build and where you are. You get a project scoped to your level. Beginner, intermediate, or advanced. The path shapes itself to where you actually are.',
            },
            {
              step: '02',
              title: 'Work through it yourself',
              desc: 'A real problem, broken into milestones you can actually finish. Each milestone ends with something testable. You set up the stack, hit real errors, and work through them.',
            },
            {
              step: '03',
              title: 'Ask for a nudge when stuck',
              desc: 'When you are genuinely stuck, ask for the next step. You get a direction, a reframe, a pointer. Never the solution. Your repo, your code, your understanding.',
            },
          ].map((item) => (
            <div key={item.step} className="rounded-xl p-7 space-y-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e8e3da' }}>
              <span className="font-mono text-sm font-bold" style={{ color: '#3d6b4f' }}>{item.step}</span>
              <p className="font-serif font-semibold text-lg leading-snug">{item.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. THREE LEVELS */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e8e3da', borderBottom: '1px solid #e8e3da' }}>
        <div className="max-w-4xl mx-auto px-8 py-20 space-y-14">
          <div className="text-center space-y-3">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>Three levels, any topic</p>
            <h2 className="font-serif text-3xl font-bold">A project shaped to where you actually are.</h2>
            <p className="text-sm max-w-lg mx-auto" style={{ color: '#6b6b6b' }}>
              Same topic, three different entry points. Pick the one that challenges you without breaking you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                level: 'Beginner',
                badge: '#f0f7f3',
                badgeText: '#3d6b4f',
                badgeBorder: '#b8d9c5',
                title: 'Build something real for the first time.',
                desc: 'Clear scope. Concepts introduced one at a time. Milestones you can finish in an afternoon. You will build something that works and understand why it works.',
              },
              {
                level: 'Intermediate',
                badge: '#fefce8',
                badgeText: '#854d0e',
                badgeBorder: '#fde68a',
                title: 'Go deeper than you have gone before.',
                desc: 'Fewer guardrails. The problem is real, the path to the solution is yours to find. You will hit walls. That is where the understanding arrives.',
              },
              {
                level: 'Advanced',
                badge: '#faf5ff',
                badgeText: '#6b21a8',
                badgeBorder: '#e9d5ff',
                title: 'Make the calls you have been avoiding.',
                desc: 'Open-ended problem. Production considerations. You make the architectural decisions. The AI questions your reasoning, not just your implementation.',
              },
            ].map((p) => (
              <div key={p.level} className="rounded-xl p-6 space-y-4" style={{ backgroundColor: '#f7f4ef', border: '1px solid #e8e3da' }}>
                <span
                  className="inline-block text-xs font-semibold px-3 py-1 rounded-full border"
                  style={{ backgroundColor: p.badge, color: p.badgeText, borderColor: p.badgeBorder }}
                >
                  {p.level}
                </span>
                <p className="font-serif font-semibold text-lg leading-snug">{p.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. THE NUDGE */}
      <section className="max-w-2xl mx-auto px-8 py-24 text-center space-y-6">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>When you are stuck</p>
        <h2 className="font-serif text-3xl font-bold leading-snug">
          Help is always there.<br />The solution never is.
        </h2>
        <div className="space-y-3 text-base leading-relaxed" style={{ color: '#6b6b6b' }}>
          <p>
            Ask for a nudge and you get a reframe, a direction, or a concrete pointer.
            The AI points at the right door. It will not open it for you.
          </p>
          <p>
            Most people don't struggle because they lack ability.
            They struggle because no one slowed down enough to explain it right.
            Abhyas is paced around the moment understanding arrives.
            Not the moment it is delivered.
          </p>
        </div>
        <p className="font-serif italic text-lg pt-2" style={{ color: '#9b9b9b' }}>
          The answer, when it arrives, arrives in your hands.<br />
          Because of that, it stays.
        </p>
      </section>

      {/* 6. CTA */}
      <section style={{ backgroundColor: '#3d6b4f' }} className="px-8 py-20">
        <div className="max-w-xl mx-auto text-center space-y-6">
          <h2 className="font-serif text-3xl font-bold" style={{ color: '#ffffff' }}>
            Pick something worth building.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: '#a7c4b0' }}>
            No cohort. No schedule. No one waiting on you.
            <br />
            Just you, a real problem, and the habit of finishing things.
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
      <footer style={{ borderTop: '1px solid #e8e3da', backgroundColor: '#f7f4ef' }} className="px-8 py-6 flex items-center justify-between">
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
