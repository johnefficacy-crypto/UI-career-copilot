/* AdminShell — sidebar + content. Recreates app/admin/layout.tsx */

const NAV = [
  { id: "overview",    label: "Overview",         icon: "layout-dashboard" },
  { id: "recruits",    label: "Recruitments",     icon: "clipboard-list" },
  { id: "orgs",        label: "Organizations",    icon: "landmark" },
  { id: "eligibility", label: "Eligibility",      icon: "check-circle" },
  { id: "scrape",      label: "Scrape Dashboard", icon: "refresh-cw" },
  { id: "sources",     label: "Source Registry",  icon: "folder-tree" },
];

const Icon = ({ name, size = 14 }) => <i data-lucide={name} className="lucide" style={{ fontSize: size }} />;

const Pill = ({ tone = "muted", children }) => <span className={`a-pill a-pill--${tone}`}>{children}</span>;

const Button = ({ variant = "primary", size, children, onClick, iconLeft, className = "", style }) => {
  const cls = ["a-btn", variant === "primary" ? "a-btn-primary" : "a-btn-ghost", size === "sm" ? "a-btn-sm" : "", className].filter(Boolean).join(" ");
  return (
    <button className={cls} onClick={onClick} style={style}>
      {iconLeft && <Icon name={iconLeft} size={12} />}{children}
    </button>
  );
};

function AdminShell({ active, onGoTo, children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", display: "flex" }}>
      <aside style={{
        width: 224, borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", flexShrink: 0,
        position: "sticky", top: 0, height: "100vh"
      }}>
        <div style={{ height: 56, display: "flex", alignItems: "center", padding: "0 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span onClick={() => onGoTo && onGoTo("_back_")} style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Career Copilot</span>
          <span style={{ marginLeft: 8, fontSize: 9, textTransform: "uppercase", letterSpacing: "0.08em", background: "var(--gold-faint)", color: "rgba(232,213,163,0.6)", border: "1px solid var(--gold-border)", padding: "2px 6px", borderRadius: 4 }}>Admin</span>
        </div>

        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
          {NAV.map(n => (
            <a key={n.id} onClick={() => onGoTo && onGoTo(n.id)} className={`a-nav-link ${active === n.id ? "active" : ""}`}>
              <span className="i"><Icon name={n.icon} size={14} /></span>
              {n.label}
            </a>
          ))}
        </nav>

        <div style={{ padding: 16, borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 4 }}>Aanya Menon · super_admin</div>
          <a onClick={() => onGoTo && onGoTo("_back_")} style={{ fontSize: 11, color: "rgba(232,213,163,0.5)", cursor: "pointer" }}>← Back to aspirant app</a>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}

Object.assign(window, { AdminShell, Icon, Pill, Button });
