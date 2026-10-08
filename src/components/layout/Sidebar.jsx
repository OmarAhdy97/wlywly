import React from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Briefcase,
  Users,
  UserCheck,
  Calculator,
  ClipboardList,
  Building2,
  ScrollText,
  Wallet,
  Library,
  LogOut,
  Moon,
  Sun,
  X,
  Settings2,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { NAV_GROUPS } from "../../lib/navigation";

const ICONS = {
  dashboard: LayoutDashboard,
  agenda: CalendarDays,
  cases: Briefcase,
  administrative: ClipboardList,
  clients: Users,
  finance: Wallet,
  formulas: ScrollText,
  library: Library,
  search: Calculator,
  team: UserCheck,
  profile: Building2,
};

export default function Sidebar({
  activeTab,
  setActiveTab,
  isDark,
  toggleTheme,
  isOpen,
  onClose,
}) {
  const { user, signOut } = useAuth();

  const handleSelect = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose}></div>}

      <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-lockup">
            <img src="/logo.png" alt="" className="brand-logo-img" />
            <div className="brand-info">
              <h2>الديوان</h2>
              <span>إدارة المكتب</span>
            </div>
          </div>
          <button type="button" className="icon-btn mobile-close-btn" onClick={onClose} aria-label="إغلاق القائمة">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.label || "main"}>
              {group.label && <div className="nav-group-label">{group.label}</div>}
              {group.items.map((item) => {
                const Icon = ICONS[item.id];
                const isActive = item.match.includes(activeTab);
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`nav-item ${isActive ? "active" : ""}`}
                    onClick={() => handleSelect(item.id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="user-mini" onClick={() => handleSelect("profile")} title="هوية المكتب">
            <span className="user-mini-icon" aria-hidden="true"><Settings2 size={16} /></span>
            <span className="sidebar-user-name">{user?.email?.split("@")[0] || "المحامي"}</span>
          </button>
          <div className="sidebar-footer-actions">
            <button type="button" className="icon-btn" onClick={toggleTheme} title={isDark ? "الوضع الفاتح" : "الوضع الليلي"} aria-label="تبديل المظهر">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" className="icon-btn is-danger" onClick={signOut} title="تسجيل الخروج" aria-label="تسجيل الخروج">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
