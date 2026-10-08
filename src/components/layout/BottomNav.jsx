import React from 'react';
import { LayoutDashboard, CalendarDays, Plus, Briefcase, Users } from 'lucide-react';

const ITEMS = [
  { id: 'dashboard', label: 'اليوم', icon: LayoutDashboard, match: ['dashboard'] },
  { id: 'agenda', label: 'الجلسات', icon: CalendarDays, match: ['agenda', 'calendar'] },
  'action',
  { id: 'cases', label: 'القضايا', icon: Briefcase, match: ['cases', 'archive'] },
  { id: 'clients', label: 'الموكلون', icon: Users, match: ['clients'] },
];

export default function BottomNav({ activeTab, setActiveTab, onOpenQuickAction }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
      {ITEMS.map((item) => {
        if (item === 'action') {
          return (
            <button key="action" type="button" className="bottom-nav-center-action" onClick={onOpenQuickAction} aria-label="إضافة">
              <span className="center-btn"><Plus size={22} /></span>
            </button>
          );
        }
        const Icon = item.icon;
        const active = item.match.includes(activeTab);
        return (
          <button
            key={item.id}
            type="button"
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
