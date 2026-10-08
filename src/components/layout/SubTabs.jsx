import React from 'react';
import { subTabsFor } from '../../lib/navigation';

export default function SubTabs({ activeTab, setActiveTab }) {
  const tabs = subTabsFor(activeTab);
  if (!tabs) return null;
  return (
    <div className="subtabs-bar">
      <div className="seg-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`seg-tab ${activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
