import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { pb, adminLogout } from "@/lib/pocketbase";

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    // If no valid auth token, redirect to login
    if (!pb.authStore.isValid) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const logout = () => {
    adminLogout();
    navigate("/admin/login");
  };

  const adminEmail = (pb.authStore.record as any)?.email ?? "Admin";

  const navItems = [
    { section: "Main", items: [{ to: "/admin", label: "Dashboard", end: true }] },
    {
      section: "Catalog",
      items: [
        { to: "/admin/categories", label: "Categories" },
        { to: "/admin/diamonds", label: "Diamonds" },
      ],
    },
    { section: "Content", items: [{ to: "/admin/media", label: "Media library" }] },
    {
      section: "Admin",
      items: [
        { to: "/admin/users", label: "Users" },
        { to: "/admin/auditlog", label: "Audit log" },
      ],
    },
    { section: "Account", items: [{ to: "/admin/settings", label: "Settings" }] },
  ];

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={{ color: "#2c2c2a", fontWeight: 500 }}>Embrace</span> Admin
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {navItems.map((group) => (
            <div key={group.section}>
              <div style={styles.navSection}>{group.section}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  style={({ isActive }) => ({
                    ...styles.navItem,
                    ...(isActive ? styles.navItemActive : {}),
                  })}
                >
                  <div style={styles.dot} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
        <div style={styles.sidebarFoot} onClick={logout}>Sign out</div>
      </div>

      {/* Main area */}
      <div style={styles.main}>
        <div style={styles.topbar}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Embrace Jewelry — Admin</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "#888780" }}>{adminEmail}</div>
            <div style={styles.userAvatar}>{adminEmail.charAt(0).toUpperCase()}</div>
          </div>
        </div>
        <div style={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { 
    display: "flex", 
    height: "100vh", 
    width: "100%", 
    background: "var(--gradient-dark)", 
    backgroundAttachment: "fixed",
    backgroundImage: "radial-gradient(140% 80% at 12% 8%, hsl(24 34% 20% / 0.55), transparent 58%), radial-gradient(120% 74% at 88% 18%, hsl(18 30% 16% / 0.52), transparent 62%), linear-gradient(132deg, hsl(18 30% 12%), hsl(21 38% 14%) 45%, hsl(15 29% 9%) 100%), repeating-linear-gradient(112deg, hsl(35 24% 26% / 0.065) 0px, hsl(35 24% 26% / 0.065) 2px, transparent 2px, transparent 16px)",
    fontFamily: "system-ui, sans-serif", 
    overflow: "hidden" 
  },
  sidebar: { 
    width: 190, 
    background: "rgba(18, 30, 12, 0.65)", 
    backdropFilter: "blur(20px)",
    borderRight: "1px solid rgba(211, 209, 199, 0.12)", 
    display: "flex", 
    flexDirection: "column", 
    flexShrink: 0 
  },
  logo: { padding: "16px", fontSize: 13, fontWeight: 500, borderBottom: "1px solid rgba(211, 209, 199, 0.12)", color: "#f8f7f2" },
  navSection: { padding: "10px 0 4px 16px", fontSize: 11, color: "#888780", letterSpacing: "0.04em" },
  navItem: { display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", cursor: "pointer", fontSize: 13, color: "#b4b2a9", borderLeft: "2px solid transparent", textDecoration: "none", transition: "all 0.12s" },
  navItemActive: { background: "rgba(255,255,255,0.05)", color: "#f8f7f2", borderLeft: "2px solid #534AB7", fontWeight: 500 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 },
  sidebarFoot: { marginTop: "auto", padding: "12px 16px", borderTop: "1px solid rgba(211, 209, 199, 0.12)", fontSize: 12, color: "#888780", cursor: "pointer" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 },
  topbar: { 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "space-between", 
    padding: "11px 18px", 
    borderBottom: "1px solid rgba(211, 209, 199, 0.12)", 
    background: "rgba(18, 30, 12, 0.35)", 
    backdropFilter: "blur(10px)",
    color: "#f8f7f2"
  },
  content: { flex: 1, overflowY: "auto", padding: 16 },
  userAvatar: { width: 30, height: 30, borderRadius: "50%", background: "rgba(83, 74, 183, 0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: "#c5a059", flexShrink: 0, border: "1px solid rgba(83, 74, 183, 0.3)" },
};
