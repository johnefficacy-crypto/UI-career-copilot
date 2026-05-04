'use client';

import { useState } from 'react';

const slides = [
  { title: 'Discover official recruitments', copy: 'Verified official recruitment notifications with canonical links.', stat: 'Official-source-first', value: 'Govt portals only' },
  { title: 'Check eligibility post-wise', copy: 'Deterministic checks for age, category, education, domicile and criteria.', stat: 'Exact match engine', value: 'Post-wise verdicts' },
  { title: 'Execute study plan', copy: 'AI-assisted plans with focus sessions, tasks, and weekly review loops.', stat: 'Today', value: '90 min Quant analysis' },
  { title: 'Track applications', copy: 'Move each exam through draft, submit, admit card and result states.', stat: 'Urgent now', value: '3 deadlines closing' },
  { title: 'Connect with community/mentors', copy: 'Exam-specific spaces, study groups and mentor marketplace access.', stat: 'Signals', value: '2 mentor replies' },
] as const;

export default function LandingProductCarousel() {
  const [index, setIndex] = useState(0);
  const go = (delta: number) => setIndex((prev) => (prev + delta + slides.length) % slides.length);

  return (
    <div className="cc-carousel" aria-label="Product workflow preview carousel">
      <div className="cc-carousel-slide" role="group" aria-live="polite" aria-label={`Slide ${index + 1} of ${slides.length}`}>
        <h3>{slides[index].title}</h3>
        <p>{slides[index].copy}</p>
        <div className="cc-slide-mockup">
          <span>{slides[index].stat}</span>
          <strong>{slides[index].value}</strong>
        </div>
      </div>
      <div className="cc-carousel-controls">
        <button type="button" onClick={() => go(-1)} aria-label="Previous slide">Previous</button>
        <div className="cc-carousel-dots">
          {slides.map((s, i) => (
            <button key={s.title} type="button" aria-label={`Go to slide ${i + 1}`} aria-pressed={i === index} className={i === index ? 'is-active' : ''} onClick={() => setIndex(i)} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} aria-label="Next slide">Next</button>
      </div>
    </div>
  );
}
