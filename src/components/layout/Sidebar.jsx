import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Calendar as CalendarIcon,
  Briefcase, 
  Users, 
  Archive, 
  UserCheck, 
  Search, 
  Gavel, 
  LogOut,
  Moon,
  Sun,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, isDark, toggleTheme, isOpen, onClose }) {
  const { user, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'agenda', label: 'رول الجلسات اليومية', icon: CalendarDays },
    { id: 'calendar', label: 'التقويم القضائي و Google', icon: CalendarIcon },
    { id: 'cases', label: 'إدارة القضايا', icon: Briefcase },
    { id: 'clients', label: 'سجل الموكلين', icon: Users },
    { id: 'archive', label: 'الأرشيف والقضايا المنتهية', icon: Archive },
    { id: 'team', label: 'فريق العمل والمحامين', icon: UserCheck },
    { id: 'search', label: 'البحث والمواعيد الإجرائية', icon: Search },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div className="sidebar-backdrop" onClick={onClose}></div>
      )}

      <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <div className="brand-icon">
              <Gavel size={24} />
            </div>
            <div className="brand-info">
              <h2>أجندة دمياط</h2>
              <span>نظام إدارة المحاماة</span>
            </div>
          </div>

          <button className="btn btn-secondary btn-icon mobile-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(item.id)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <div className="user-mini">
            <div className="avatar">
              {user?.email ? user.email.charAt(0).toUpperCase() : 'م'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '120px' }}>
                {user?.email?.split('@')[0] || 'المحامي'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#8ea3bf' }}>متصل الآن</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button 
              className="btn btn-secondary btn-icon" 
              onClick={toggleTheme} 
              title={isDark ? 'الوضع الفاتح' : 'الوضع الليلي'}
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <button 
              className="btn btn-danger btn-icon" 
              onClick={signOut} 
              title="تسجيل الخروج"
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
