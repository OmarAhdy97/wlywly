// One place that decides how the app's tabs are grouped. The tab ids themselves never changed,
// so every existing setActiveTab('agenda' | 'calendar' | ...) call keeps working.

export const NAV_GROUPS = [
  { label: '', items: [
    { id: 'dashboard', label: 'المكتب الرقمي', match: ['dashboard'] },
  ] },
  { label: 'العمل اليومي', items: [
    { id: 'agenda', label: 'الجلسات', match: ['agenda', 'calendar'] },
    { id: 'cases', label: 'القضايا', match: ['cases', 'archive'] },
    { id: 'administrative', label: 'المهام', match: ['administrative', 'bailiffs'] },
  ] },
  { label: 'الموكلون والحسابات', items: [
    { id: 'clients', label: 'الموكلون', match: ['clients'] },
    { id: 'finance', label: 'المالية', match: ['finance'] },
  ] },
  { label: 'أدوات', items: [
    { id: 'formulas', label: 'الصيغ القانونية', match: ['formulas'] },
    { id: 'library', label: 'المكتبة القانونية', match: ['library'] },
    { id: 'search', label: 'الحاسبة', match: ['search'] },
  ] },
  { label: 'المكتب', items: [
    { id: 'team', label: 'فريق العمل', match: ['team'] },
    { id: 'profile', label: 'هوية المكتب', match: ['profile'] },
  ] },
];

// Pages that share one slot in the menu get a small switcher on top.
export const SUB_TABS = {
  sessions: [
    { id: 'agenda', label: 'الرول' },
    { id: 'calendar', label: 'التقويم' },
  ],
  cases: [
    { id: 'cases', label: 'القضايا الجارية' },
    { id: 'archive', label: 'الأرشيف' },
  ],
  tasks: [
    { id: 'administrative', label: 'أعمال إدارية' },
    { id: 'bailiffs', label: 'المحضرون' },
  ],
};

export function subTabsFor(tab) {
  return Object.values(SUB_TABS).find((tabs) => tabs.some((t) => t.id === tab)) || null;
}
