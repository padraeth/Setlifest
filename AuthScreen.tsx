import { ArrowUpRight, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/ui';
import { ErrorBanner } from '../components/Feedback';
import { useWorkspace } from '../state/WorkspaceContext';

export function AuthScreen() {
  const { auth, signIn } = useWorkspace();
  return <main className="auth-screen">
    <div className="auth-top"><BrandMark /><span className="auth-kicker"><span className="status-dot" /> Your private life workspace</span></div>
    <div className="auth-content">
      <section className="auth-copy">
        <p className="eyebrow">A quieter way forward</p>
        <h1>Make room for<br /><em>what matters.</em></h1>
        <p className="auth-lead">Bring your habits, plans, goals, and learning into one thoughtful space — built around the life you’re shaping.</p>
        {auth.error && <ErrorBanner message={auth.error} />}
        <Button size="lg" onClick={() => void signIn()} className="auth-button">Continue with Manus <ArrowUpRight size={17} /></Button>
        <p className="auth-privacy"><ShieldCheck size={15} /> Your workspace is private to your account.</p>
      </section>
      <section className="auth-art" aria-label="Abstract illustration of connected paths">
        <div className="orbital orbital-one" /><div className="orbital orbital-two" /><div className="orbital orbital-three" />
        <div className="hero-orb"><div className="orb-core" /><span className="orb-ring ring-a" /><span className="orb-ring ring-b" /></div>
        <div className="orbit-node node-a"><Sparkles size={15} /><span>Small steps</span></div>
        <div className="orbit-node node-b"><span className="node-dot blue-dot" /><span>Clear direction</span></div>
        <div className="orbit-node node-c"><span className="node-dot amber-dot" /><span>More of you</span></div>
        <div className="art-caption">A system for the days<br />that make a life.</div>
      </section>
    </div>
    <footer className="auth-footer"><span>SETLIFEST / PERSONAL LIFE OS</span><span>Shape a day. Shape a life.</span></footer>
  </main>;
}
