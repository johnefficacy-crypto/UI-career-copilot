import React from 'react';
import Link from 'next/link';

// Landing page for Career Copilot. This page introduces the product to
// potential users and summarises the key features of the platform.
// The design emphasises clarity, concise messaging and clear calls to action.
// It uses simple inline styles and existing CSS utility classes defined in
// `globals.css` to maintain consistency with the rest of the app.

export default function LandingPage() {
  return (
    <div>
      {/* Hero section */}
      <section
        style={{
          background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)',
          padding: '4rem 1.5rem',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <div
          style={{ maxWidth: '1040px', margin: '0 auto', textAlign: 'center' }}
        >
          <h1
            style={{
              fontSize: '2.6rem',
              lineHeight: 1.15,
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '1.2rem',
            }}
          >
            Crack Exams Smarter&nbsp;— Not Harder
          </h1>
          <p
            style={{
              fontSize: '1.15rem',
              color: '#4b5563',
              marginBottom: '2rem',
              maxWidth: 700,
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            Career Copilot unites your study plan, exam updates,
            accountability partners and community into one powerful dashboard.
            Plan your journey, stay on top of deadlines and learn from peers –
            all in one place.
          </p>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
          {/* Primary call to action leads into the app */}
            <Link href="/today" className="btn btn-primary" style={{ fontSize: '1rem' }}>
              Start For Free
            </Link>
            <a
              href="#features"
              className="btn btn-outline"
              style={{ fontSize: '1rem' }}
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section id="features" className="page" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '2.5rem',
            color: '#1f2937',
          }}
        >
          Everything You Need to Ace Your Exams
        </h2>
        <div className="grid-2" style={{ gap: '2rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📚</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.4rem', color: '#1f2937' }}>Personalised Study Plans</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              AI‑curated tasks, weekly goals and smart trade‑offs ensure you’re always
              focused on what matters most. Generate a plan for multiple exams or
              customise your own.
            </p>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📅</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.4rem', color: '#1f2937' }}>Exam Deadlines & Applications</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              Keep track of every notification, eligibility criteria and important
              dates across UPSC, SSC, banking and more. Apply on time and never
              miss a critical deadline again.
            </p>
          </div>
        </div>
        <div className="grid-2" style={{ gap: '2rem', marginTop: '2rem' }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🤝</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.4rem', color: '#1f2937' }}>Accountability Partners</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              Partner with other aspirants to set commitments, check in weekly and
              pay (or collect) small penalties when you miss tasks. Healthy
              pressure and mutual support, without the spam.
            </p>
          </div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>💬</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.4rem', color: '#1f2937' }}>Community & Resources</h3>
            <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
              Share notes, strategies and PYQs with verified toppers and fellow
              candidates. Discover curated books, PDFs and mock tests in our
              marketplace to upgrade your prep.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section className="page" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '2rem',
            color: '#1f2937',
          }}
        >
          Flexible Plans For Every Aspirant
        </h2>
        <div className="grid-3" style={{ gap: '2rem' }}>
          {/* Free Tier */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>Free</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#4f46e5', marginBottom: '1rem' }}>₹0</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', textAlign: 'left' }}>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Basic study planner</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Exam deadline tracking</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Browse community posts</li>
            </ul>
            <Link href="/today" className="btn btn-primary" style={{ width: '100%' }}>Start Free</Link>
          </div>
          {/* Pro Tier */}
          <div className="card" style={{ textAlign: 'center', borderColor: '#4f46e5' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>Pro</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#4f46e5', marginBottom: '1rem' }}>₹199/mo</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', textAlign: 'left' }}>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Everything in Free</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Accountability partners</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Unlimited community posts</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Detailed analytics</li>
            </ul>
            <Link href="/today" className="btn btn-upgrade" style={{ width: '100%' }}>Upgrade</Link>
          </div>
          {/* Elite Tier */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1f2937', marginBottom: '0.5rem' }}>Elite</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, color: '#4f46e5', marginBottom: '1rem' }}>₹499/mo</p>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', textAlign: 'left' }}>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Everything in Pro</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ 1:1 mentor sessions</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Premium study resources</li>
              <li style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#374151' }}>✓ Early exam insights</li>
            </ul>
            <Link href="/today" className="btn btn-upgrade" style={{ width: '100%' }}>Go Elite</Link>
          </div>
        </div>
      </section>

      {/* Testimonials section */}
      <section className="page" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
        <h2
          style={{
            textAlign: 'center',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '2rem',
            color: '#1f2937',
          }}
        >
          Loved By Aspirants Nationwide
        </h2>
        <div className="grid-3" style={{ gap: '2rem' }}>
          <div className="card" style={{ textAlign: 'left' }}>
            <p style={{ fontStyle: 'italic', color: '#374151', marginBottom: '0.75rem' }}>
              “Career Copilot keeps me focused every single day. I never miss a
              deadline and I love checking in with my partner each week.”
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="avatar">PS</div>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937' }}>Priya S.</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>UPSC CSE aspirant</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'left' }}>
            <p style={{ fontStyle: 'italic', color: '#374151', marginBottom: '0.75rem' }}>
              “The study plan generator saved me hours of planning. With the
              community’s notes and tips, I finally cleared my SSC tier‑I!”
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="avatar">AK</div>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937' }}>Arjun K.</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>SSC CGL candidate</div>
              </div>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'left' }}>
            <p style={{ fontStyle: 'italic', color: '#374151', marginBottom: '0.75rem' }}>
              “I upgraded to Pro for the accountability partner feature and it’s
              been a game changer. There’s nothing like a small penalty to keep
              you honest!”
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="avatar">MR</div>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937' }}>Meera R.</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>IBPS PO aspirant</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final call to action */}
      <section
        style={{
          background: 'linear-gradient(135deg,#ede9fe,#f5f3ff)',
          padding: '3.5rem 1.5rem',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              color: '#1f2937',
              marginBottom: '1rem',
            }}
          >
            Ready to Begin Your Journey?
          </h2>
          <p
            style={{ fontSize: '1rem', color: '#4b5563', marginBottom: '2rem' }}
          >
            Join thousands of aspirants using Career Copilot to organise their
            preparation, stay accountable and succeed. It’s free to get started.
          </p>
          <Link href="/today" className="btn btn-primary" style={{ fontSize: '1rem' }}>
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}