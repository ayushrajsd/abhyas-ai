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
    <div className="min-h-screen" style={{ backgroundColor: '#f7f4ef', color: '#1c1c1c' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #ddd8cf' }} className="flex items-center justify-between px-8 py-5">
        <span className="font-serif text-lg font-semibold">
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span>
        </span>
        <a href="https://tapovan.ai" className="text-sm transition-colors" style={{ color: '#6b6b6b' }}>
          ← Tapovan.ai
        </a>
      </nav>

      {/* ── 1. HERO ── */}
      <section className="max-w-5xl mx-auto px-8 py-24 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3d6b4f' }}>
              A project-based AI learning platform
            </p>
            <h1 className="font-serif text-5xl font-bold leading-tight">
              Learn by building.<br />
              <span style={{ color: '#3d6b4f' }}>Never by watching.</span>
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: '#6b6b6b' }}>
              Pick a topic. Get a real project. Work through it on your own machine.
              When you're stuck, ask for a nudge — not the answer.
            </p>
          </div>
          <div className="space-y-3">
            {searchParams.error && (
              <p className="text-sm rounded-lg px-4 py-3" style={{ color: '#b91c1c', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
                Authentication failed. Please try again.
              </p>
            )}
            <GitHubSignInButton />
            <p className="text-xs" style={{ color: '#9b9b9b' }}>
              Only reads your GitHub username and email. No repo access at sign-in.
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-8 space-y-5" style={{ backgroundColor: '#ffffff', border: '1px solid #ddd8cf', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <p className="font-serif text-xl leading-relaxed italic" style={{ color: '#1c1c1c' }}>
            "The moment you stop reading about something and start building it — that is the moment you actually learn."
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2" style={{ borderTop: '1px solid #ddd8cf' }}>
            {['Build real projects', 'Nudged, not spoonfed', 'GitHub-verified'].map(f => (
              <span key={f} className="text-sm flex items-center gap-1.5" style={{ color: '#3d6b4f' }}>
                <span>◆</span> {f}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 2. THE PROBLEM ── */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #ddd8cf', borderBottom: '1px solid #ddd8cf' }}>
        <div className="max-w-3xl mx-auto px-8 py-20 text-center space-y-6">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>Why this exists</p>
          <h2 className="font-serif text-3xl font-bold">
            There is a difference between using AI and understanding it.
          </h2>
          <p className="text-lg leading-relaxed" style={{ color: '#6b6b6b' }}>
            Most tutorials hand you the code. Most courses hand you the slides. You follow along, it works,
            and three days later you can't reproduce it. Not because you weren't paying attention —
            because you were never actually doing it.
          </p>
          <p className="text-lg leading-relaxed font-medium" style={{ color: '#1c1c1c' }}>
            Abhyas gives you a project and asks you to finish it. The AI is there when you're stuck —
            pointing, not writing.
          </p>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ── */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center space-y-3 mb-16">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>The flow</p>
          <h2 className="font-serif text-3xl font-bold">How a project comes together</h2>
          <p style={{ color: '#6b6b6b' }}>Five steps. You do the work. AI handles the rest.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { n: '01', title: 'Pick a topic', desc: 'Choose what you want to learn — RAG, Agents, Embeddings. Set your skill level.' },
            { n: '02', title: 'Get a project', desc: 'AI generates 5–7 project ideas matched to your level. You pick one and commit.' },
            { n: '03', title: 'Work through milestones', desc: 'Each project breaks into 4–6 milestones. Tasks are strictly ordered. You can\'t skip.' },
            { n: '04', title: 'Ask for a nudge', desc: 'Stuck? You get a hint — never a solution. Three escalating levels, none of which write your code.' },
            { n: '05', title: 'Verify and reflect', desc: 'Verify via GitHub when done. Walk away with a real project and a LinkedIn post about what you actually built.' },
          ].map((step) => (
            <div key={step.n} className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#ffffff', border: '1px solid #ddd8cf' }}>
              <span className="font-mono text-xs font-bold" style={{ color: '#3d6b4f' }}>{step.n}</span>
              <p className="font-serif font-semibold text-base">{step.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. THE NUDGE PHILOSOPHY ── */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #ddd8cf', borderBottom: '1px solid #ddd8cf' }}>
        <div className="max-w-5xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-5">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>On being stuck</p>
            <h2 className="font-serif text-3xl font-bold">Stuck is not the same as lost.</h2>
            <p className="leading-relaxed" style={{ color: '#6b6b6b' }}>
              When you ask for help, you get the next question — not the solution.
              Three escalating levels of help: a conceptual reframe, a direction, a concrete shape.
              At no level does the AI write working code for you.
            </p>
            <p className="leading-relaxed" style={{ color: '#6b6b6b' }}>
              The answer, when it arrives, arrives in your hands. Because of that, it stays.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { level: 'Level 1', label: 'Conceptual', desc: 'Reframes the problem. Points to the right mental model.' },
              { level: 'Level 2', label: 'Directional', desc: 'Names the right part of the problem and gives a direction.' },
              { level: 'Level 3', label: 'Concrete', desc: 'Names the exact issue. Shows the shape — never fills it in.' },
            ].map((h) => (
              <div key={h.level} className="rounded-xl px-5 py-4 flex gap-4 items-start" style={{ backgroundColor: '#f7f4ef', border: '1px solid #ddd8cf' }}>
                <div className="shrink-0">
                  <span className="text-xs font-bold" style={{ color: '#3d6b4f' }}>{h.level}</span>
                  <p className="text-sm font-semibold">{h.label}</p>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. WHAT YOU BUILD ── */}
      <section className="max-w-5xl mx-auto px-8 py-24">
        <div className="text-center space-y-3 mb-14">
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>V1 topic — RAG</p>
          <h2 className="font-serif text-3xl font-bold">Real projects. Real code. Real repos.</h2>
          <p style={{ color: '#6b6b6b' }}>These are the kinds of projects you'll pick from when you enter RAG as your topic.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { tag: 'BEGINNER', color: '#d1fae5', tagColor: '#065f46', title: 'Document Q&A Bot', desc: 'Upload PDFs, ask questions, get answers grounded in your documents. Teaches chunking, embedding, and retrieval end to end.' },
            { tag: 'INTERMEDIATE', color: '#fef3c7', tagColor: '#92400e', title: 'Code Search Engine', desc: 'Index a GitHub repo and search it semantically. Teaches vector stores, code tokenisation, and hybrid retrieval.' },
            { tag: 'CHALLENGING', color: '#ede9fe', tagColor: '#5b21b6', title: 'Research Paper Assistant', desc: 'Multi-hop reasoning across 50+ papers. Teaches re-ranking, citation grounding, and hallucination detection.' },
          ].map((p) => (
            <div key={p.title} className="rounded-xl p-6 space-y-3" style={{ backgroundColor: p.color, border: '1px solid #ddd8cf' }}>
              <span className="text-xs font-bold tracking-widest" style={{ color: p.tagColor }}>{p.tag}</span>
              <p className="font-serif font-semibold text-lg">{p.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 6. DIFFERENT BY DESIGN ── */}
      <section style={{ backgroundColor: '#ffffff', borderTop: '1px solid #ddd8cf', borderBottom: '1px solid #ddd8cf' }}>
        <div className="max-w-5xl mx-auto px-8 py-20">
          <div className="text-center space-y-3 mb-14">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#9b9b9b' }}>Built differently</p>
            <h2 className="font-serif text-3xl font-bold">Some deliberate choices.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: 'Your key, not ours', desc: 'You bring your own Anthropic or OpenAI API key. It\'s encrypted with AES-256-GCM and decrypted only during agent calls. We never see it, never bill you for tokens.' },
              { title: 'Your machine, not ours', desc: 'You build locally. No browser IDE, no sandboxed environment. You set up your own stack, hit real errors, and fix them. That friction is the point.' },
              { title: 'Verified, not self-reported', desc: 'Milestone completion is verified against your actual GitHub repo. The AI reads your code — it doesn\'t take your word for it.' },
              { title: 'Honest, not encouraging', desc: 'The verifier can return "partial" or "cannot assess." No forced positivity. If you didn\'t finish the milestone, you\'ll know.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl p-6 space-y-2" style={{ backgroundColor: '#f7f4ef', border: '1px solid #ddd8cf' }}>
                <p className="font-serif font-semibold text-lg">{item.title}</p>
                <p className="text-sm leading-relaxed" style={{ color: '#6b6b6b' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. CTA ── */}
      <section className="max-w-xl mx-auto px-8 py-24 text-center space-y-8">
        <h2 className="font-serif text-3xl font-bold">Start with one project.</h2>
        <p className="leading-relaxed" style={{ color: '#6b6b6b' }}>
          Pick RAG. Pick a difficulty. Work through it. That's the whole thing.
          No subscription, no cohort, no deadline.
        </p>
        <div className="flex flex-col items-center gap-3">
          <GitHubSignInButton />
          <p className="text-xs" style={{ color: '#9b9b9b' }}>
            Free to start · Bring your own API key · Runs on your machine
          </p>
        </div>
        <p className="font-serif text-sm italic" style={{ color: '#b5b0a5' }}>
          अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते — BG 6.35
        </p>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #ddd8cf' }} className="px-8 py-6 flex items-center justify-between">
        <span className="font-serif text-sm" style={{ color: '#9b9b9b' }}>
          Abhyas<span style={{ color: '#3d6b4f' }}>.ai</span> · part of <a href="https://tapovan.ai" style={{ color: '#3d6b4f' }}>Tapovan.ai</a>
        </span>
        <span className="text-xs" style={{ color: '#b5b0a5' }}>MIT · Open Source</span>
      </footer>

    </div>
  )
}
