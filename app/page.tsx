import Link from "next/link";
import ThemeToggle from "./components/ThemeToggle";

const EXAM_CHIPS = ["UPSC", "SSC", "IBPS", "SBI", "RBI", "SEBI", "NABARD", "Railways", "State PSC", "PSU"];

const TRUST_PILLARS = [
  "Official sources only",
  "Admin-verified recruitments",
  "Deterministic eligibility",
  "Canonical apply links",
  "Deadline-first workflow",
];

const WORKFLOW = [
  ["Discover", "Official exam notifications from verified sources."],
  ["Match", "Age, category, education, domicile, PwBD, attempts and post-wise criteria checked deterministically."],
  ["Understand", "PYQ trends, cutoff history, vacancy trends and competition signals."],
  ["Prepare", "AI study plans, focus sessions, mock tracking and weekly reviews."],
  ["Connect", "Exam-specific spaces, mentors, study groups and accountability partners."],
  ["Act", "Deadline reminders, document checklists, application tracker, admit card and result alerts."],
] as const;

export default function LandingPage() {
  return (
    <div className="cc-page-shell cc-grid-bg">
      <header className="cc-nav">
        <div className="cc-nav-inner">
          <Link href="/" className="cc-logo">Career Copilot</Link>
          <nav className="cc-nav-links" aria-label="Marketing">
            <a href="#product" className="cc-nav-link">Product</a>
            <a href="#eligibility" className="cc-nav-link">Eligibility</a>
            <a href="#pricing" className="cc-nav-link">Pricing</a>
            <Link href="/auth/login" className="cc-nav-link">Sign in</Link>
            <ThemeToggle />
            <Link href="/auth/signup" className="cc-btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="cc-section cc-hero">
          <div className="cc-pill cc-gold-glow">Official-source-first exam intelligence</div>
          <h1 className="cc-hero-title">Stop missing the right government exams.</h1>
          <p className="cc-hero-subtitle">Career Copilot tracks official recruitment notifications, checks your eligibility post-wise, and turns every deadline into a clear next action.</p>
          <p className="cc-hero-support">For UPSC, SSC, Banking, Railways, Regulatory bodies, State PSCs, PSUs and more.</p>
          <div className="cc-cta-row">
            <Link href="/auth/signup" className="cc-btn-primary">Check my eligible exams</Link>
            <Link href="/dashboard" className="cc-btn-secondary">Explore official notifications</Link>
          </div>
          <div className="cc-chip-row">{EXAM_CHIPS.map((chip) => <span key={chip} className="cc-pill">{chip}</span>)}</div>
        </section>

        <section className="cc-section cc-trust-strip">{TRUST_PILLARS.map((item) => <div key={item} className="cc-card-static">{item}</div>)}</section>

        <section id="product" className="cc-section">
          <p className="cc-section-label">Product workflow</p>
          <div className="cc-workflow-grid">{WORKFLOW.map(([title, body]) => <article key={title} className="cc-card"><h3>{title}</h3><p>{body}</p></article>)}</div>
        </section>

        <section className="cc-section">
          <p className="cc-section-label">Mission Control preview</p>
          <div className="cc-card cc-mission-panel">
            <div className="cc-stats-grid">
              <div className="cc-stat-tile"><strong>12</strong><span>Eligible now</span></div>
              <div className="cc-stat-tile"><strong>3</strong><span>Urgent deadlines</span></div>
              <div className="cc-stat-tile"><strong>Domicile, PwBD status</strong><span>Missing profile fields</span></div>
            </div>
            <p><strong>Next action:</strong> Complete SEBI Grade A application.</p>
            <p><strong>Today’s study target:</strong> Quant mock analysis, 90 minutes.</p>
            <p><strong>Application tracker:</strong> Not started → Draft → Submitted → Admit card → Result</p>
          </div>
        </section>

        <section id="eligibility" className="cc-section">
          <p className="cc-section-label">Eligibility intelligence</p>
          <div className="cc-card">
            <h2>Eligibility is not a checkbox. It is your opportunity map.</h2>
            <p>Free users can discover official notifications and view a limited eligibility preview count.</p>
            <ul>
              <li>Exact post-wise eligibility matching</li><li>Why eligible / not eligible reasoning</li><li>Missing-field diagnostics</li><li>Official apply links</li><li>Deadline reminders</li>
            </ul>
            <p>The deterministic engine checks eligibility. AI assists by explaining results and suggesting preparation actions.</p>
          </div>
        </section>

        <section className="cc-section">
          <p className="cc-section-label">Community + marketplace</p>
          <div className="cc-workflow-grid">
            <article className="cc-card"><h3>Structured exam spaces</h3><p>Exam-specific discussions with official updates separated from aspirant discussions.</p></article>
            <article className="cc-card"><h3>Mentor access</h3><p>Verified mentor sessions and accountability-oriented study groups.</p></article>
            <article className="cc-card"><h3>Marketplace discovery</h3><p>Resources and courses discovery for smarter decisions, not noisy ad feeds.</p></article>
          </div>
        </section>

        <section id="pricing" className="cc-section">
          <p className="cc-section-label">Pricing</p>
          <div className="cc-pricing-grid">
            <article className="cc-pricing-card"><h3>Free</h3><ul><li>Official notification discovery</li><li>Basic tracking</li><li>Eligibility preview count</li></ul></article>
            <article className="cc-pricing-card cc-pricing-featured"><h3>Pro — ₹299/month</h3><ul><li>Exact eligibility matching</li><li>Post-wise reasons</li><li>Deadline tracker</li><li>Application tracker</li><li>Study OS</li></ul></article>
            <article className="cc-pricing-card"><h3>Elite — ₹499/month</h3><ul><li>Everything in Pro</li><li>Mentor access</li><li>Study groups/accountability</li><li>Advanced analytics</li><li>Priority alerts when available</li></ul></article>
          </div>
        </section>

        <section className="cc-section cc-final-cta">
          <h2>Your next exam opportunity should not slip past you.</h2>
          <Link href="/auth/signup" className="cc-btn-primary">Create free account</Link>
        </section>
      </main>

      <footer className="cc-footer">
        <div>© {new Date().getFullYear()} Career Copilot</div>
        <div className="cc-footer-links">
          <a href="#product">Product</a><a href="#pricing">Pricing</a><Link href="/marketplace">Marketplace</Link><Link href="/auth/login">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
