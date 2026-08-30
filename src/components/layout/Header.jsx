import React from 'react';
import { Search, Plus, RefreshCw, Bell, Menu } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function Header({ onOpenQuickAction, searchTerm, setSearchTerm, setActiveTab, onToggleSidebar }) {
  const { refreshAll, loading, cases } = useData();

  // Urgent hearings count (e.g. today)
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingCount = cases.filter(c => c.next_session_date && c.next_session_date.startsWith(todayStr)).length;

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm) {
      setActiveTab('search');
    }
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        {/* Mobile Menu Button */}
        <button 
          className="btn btn-secondary btn-icon mobile-menu-toggle"
          onClick={onToggleSidebar}
          title="القائمة"
        >
          <Menu size={20} />
        </button>

        {/* Search Bar */}
        <form className="header-search" onSubmit={handleSearchSubmit}>
          <Search size={18} style={{ color: 'var(--text-subtle)', flexShrink: 0 }} />
          <input 
            type="text" 
            placeholder="ابحث برقم القضية، الموكل..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
      </div>

      {/* Header Actions */}
      <div className="header-actions">
        <button 
          className="btn btn-secondary btn-icon" 
          onClick={refreshAll} 
          disabled={loading}
          title="تحديث البيانات"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>

        {upcomingCount > 0 && (
          <div 
            className="badge hide-mobile-sm" 
            style={{ background: 'var(--status-adjourned-bg)', color: 'var(--status-adjourned)', cursor: 'pointer', padding: '0.45rem 0.8rem' }}
            onClick={() => setActiveTab('agenda')}
            title="جلسات اليوم"
          >
            <Bell size={15} />
            <span>{upcomingCount} جلسات اليوم</span>
          </div>
        )}

        <button 
          className="btn btn-gold desktop-quick-btn" 
          onClick={onOpenQuickAction}
        >
          <Plus size={18} />
          <span>إجراء سريع</span>
        </button>
      </div>
    </header>
  );
}
