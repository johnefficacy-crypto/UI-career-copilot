/* Aspirant UI kit — reusable primitives */

const Icon = ({ name, size = 16, className = "" }) => (
  <i data-lucide={name} className={`lucide ${className}`} style={{ fontSize: size }} />
);

const Eyebrow = ({ children, style }) => <div className="cc-eyebrow" style={style}>{children}</div>;

const Button = ({ variant = "primary", size, children, onClick, iconLeft, iconRight, className = "", style, disabled }) => {
  const cls = ["cc-btn", variant === "primary" ? "cc-btn-primary" : variant === "ghost" ? "cc-btn-ghost" : "cc-btn-ghost",
               size === "sm" ? "cc-btn-sm" : "", className].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} disabled={disabled} style={{ ...(disabled ? {opacity:0.5, cursor:"not-allowed"} : {}), ...style }}>
      {iconLeft && <Icon name={iconLeft} size={14} />}
      {children}
      {iconRight && <Icon name={iconRight} size={14} />}
    </button>
  );
};

const Pill = ({ tone = "muted", children, icon }) => (
  <span className={`cc-pill cc-pill--${tone}`}>
    {icon && <Icon name={icon} size={11} />}
    {children}
  </span>
);

const Card = ({ children, style, className = "" }) => (
  <div className={`cc-card ${className}`} style={style}>{children}</div>
);

const ProgressBar = ({ pct = 50, color }) => (
  <div className="cc-progress">
    <i style={{ width: `${pct}%`, background: color || undefined }} />
  </div>
);

const Input = ({ placeholder, defaultValue, type = "text", style }) => (
  <input className="cc-input" type={type} placeholder={placeholder} defaultValue={defaultValue} style={style} />
);

const StatTile = ({ label, value, sub, accent }) => (
  <div style={{
    background: accent ? "rgba(232,213,163,0.04)" : "var(--bg-surface)",
    border: `1px solid ${accent ? "var(--gold-border)" : "var(--border)"}`,
    borderRadius: "var(--radius-lg)", padding: "16px 18px"
  }}>
    <div className="cc-eyebrow" style={{ marginBottom: 6 }}>{label}</div>
    <div className="cc-serif" style={{ fontSize: 28, color: accent ? "var(--gold)" : "var(--text-primary)", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>{sub}</div>}
  </div>
);

Object.assign(window, { Icon, Eyebrow, Button, Pill, Card, ProgressBar, Input, StatTile });
