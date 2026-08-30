import React from 'react';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Plus, 
  Briefcase, 
  Users 
} from 'lucide-react';

export default function BottomNav({ activeTab, setActiveTab, onOpenQuickAction }) {
  return (
    <nav className="mobile-bottom-nav">
      <div 
        className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} />
        <span>الرئيسية</span>
      </div>

      <div 
        className={`bottom-nav-item ${activeTab === 'agenda' ? 'active' : ''}`}
        onClick={() => setActiveTab('agenda')}
      >
        <CalendarDays size={20} />
        <span>الأجندة</span>
      </div>

      {/* Floating Center Action Button */}
      <div className="bottom-nav-center-action" onClick={onOpenQuickAction}>
        <div className="center-btn">
          <Plus size={24} />
        </div>
      </div>

      <div 
        className={`bottom-nav-item ${activeTab === 'cases' ? 'active' : ''}`}
        onClick={() => setActiveTab('cases')}
      >
        <Briefcase size={20} />
        <span>القضايا</span>
      </div>

      <div 
        className={`bottom-nav-item ${activeTab === 'clients' ? 'active' : ''}`}
        onClick={() => setActiveTab('clients')}
      >
        <Users size={20} />
        <span>الموكلين</span>
      </div>
    </nav>
  );
}
