/* AppShell — sticky app nav, used across dashboard / notifications / chat */

const APP_NAV = [
  { id: "dashboard",    label: "Dashboard" },
  { id: "notifications",label: "Notifications" },
  { id: "chat",         label: "AI Chat" },
  { id: "study-plan",   label: "Study Plan" },
  { id: "marketplace",  label: "Marketplace" },
  { id: "forum",        label: "Forum" },
];

function AppNav({ active, onGoTo }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 40, height: 56,
      borderBottom: "1px solid var(--border)",
      background: "rgba(15,15,15,0.85)", backdropFilter: "blur(12px)",
    }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span onClick={() => onGoTo("marketing")} style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 500, cursor: "pointer" }}>Career Copilot</span>
          <div style={{ display: "flex", gap: 2 }}>
            {APP_NAV.map(n => (
              <a key={n.id} onClick={() => onGoTo(n.id)}
                 className={`cc-nav-link ${active === n.id ? "active" : ""}`}
                 style={{ padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Icon name="bell" size={18} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 10px 4px 4px", borderRadius: 9999, border: "1px solid var(--border)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 9999, background: "var(--gold-faint)", color: "var(--gold)", display: "grid", placeItems: "center", fontFamily: "var(--font-serif)", fontSize: 12, fontWeight: 500 }}>P</div>
            <span style={{ fontSize: 13, color: "var(--text-body)" }}>Priya</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

window.AppNav = AppNav;
