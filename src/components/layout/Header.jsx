import React from 'react';
import { Search, Plus, RefreshCw, Menu } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function Header({ onOpenQuickAction, setActiveTab, onToggleSidebar, onOpenPalette }) {
  const { refreshAll, loading, cases } = useData();

  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = cases.filter(c => c.next_session_date && c.next_session_date.startsWith(todayStr)).length;

  return (
    <header className="app-header">
      <div className="header-search-container">
        <button
          type="button"
          className="icon-btn mobile-menu-toggle"
          onClick={onToggleSidebar}
          title="القائمة"
          aria-label="القائمة الجانبية"
        >
          <Menu size={20} />
        </button>

        <button type="button" className="header-search header-search-btn" onClick={onOpenPalette} aria-label="بحث سريع">
          <Search size={17} />
          <span className="header-search-text">ابحث برقم القضية أو اسم الموكل…</span>
          <kbd className="header-kbd">Ctrl K</kbd>
        </button>
      </div>

      <div className="header-actions">
        {todayCount > 0 && (
          <button type="button" className="header-today hide-mobile-sm" onClick={() => setActiveTab('agenda')}>
            <span className="header-today-dot" />
            {todayCount} {todayCount === 1 ? 'جلسة اليوم' : 'جلسات اليوم'}
          </button>
        )}

        <button
          type="button"
          className="icon-btn"
          onClick={refreshAll}
          disabled={loading}
          title="تحديث البيانات"
          aria-label="تحديث البيانات"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>

        <button type="button" className="btn btn-primary desktop-quick-btn" onClick={onOpenQuickAction}>
          <Plus size={16} />
          <span>إضافة</span>
        </button>
      </div>
    </header>
  );
}
