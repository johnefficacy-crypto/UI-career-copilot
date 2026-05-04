export default function HeroProductStack() {
  const cards = [
    ['Eligibility Match', '12 eligible exams'],
    ['Deadline Alert', '3 deadlines closing'],
    ['Study Plan', '90 min study target'],
    ['Application Tracker', 'SEBI Grade A: Draft'],
    ['Community Signal', '2 mentor replies'],
  ] as const;

  return (
    <div className="cc-hero-product-stack" aria-label="Sample product preview cards">
      {cards.map(([title, value], i) => (
        <article className="cc-hero-visual-card cc-float-card" key={title} style={{ ['--i' as string]: i }}>
          <p>{title}</p>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}
