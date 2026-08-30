import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yaeoaygausgibnggqzej.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZW9heWdhdXNnaWJuZ2dxemVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzk4NDUsImV4cCI6MjEwMzYxNTg0NX0.bv5hlwzNPOt0-F5opOwkSE6MkxrC1klCjnF1E1QVEFU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper translations & mappings
export const CASE_TYPES = {
  civil: 'مدني',
  criminal: 'جنائي',
  family: 'أسرة',
  commercial: 'تجاري',
  labor: 'عمالي',
  administrative: 'مجلس دولة',
  misdemeanor: 'جنح',
  felony: 'جنايات',
  urgency: 'مستعجل',
};

export const COURT_LEVELS = {
  summary: 'جزئي',
  primary: 'ابتدائي',
  appeal: 'استئناف',
  cassation: 'نقض',
  stateCouncil: 'مجلس الدولة',
};

export const CASE_STATUSES = {
  active: { label: 'منظورة', color: 'var(--status-active)', bg: 'var(--status-active-bg)' },
  adjourned: { label: 'مؤجلة', color: 'var(--status-adjourned)', bg: 'var(--status-adjourned-bg)' },
  judgmentReserved: { label: 'محجوزة للحكم', color: 'var(--status-reserved)', bg: 'var(--status-reserved-bg)' },
  finalJudgment: { label: 'حكم نهائي', color: 'var(--status-judgment)', bg: 'var(--status-judgment-bg)' },
  preliminaryJudgment: { label: 'حكم تمهيدي', color: 'var(--status-prelim)', bg: 'var(--status-prelim-bg)' },
  dismissed: { label: 'مشطوبة / مرفوضة', color: 'var(--status-dismissed)', bg: 'var(--status-dismissed-bg)' },
  settled: { label: 'صلح / منتهية', color: 'var(--status-settled)', bg: 'var(--status-settled-bg)' },
};

export const USER_ROLES = {
  managingPartner: 'محامي نقض / مدير المكتب',
  seniorLawyer: 'محامي استئناف',
  authorizedLawyer: 'محامي ابتدائي / موكل',
  traineeLawyer: 'محامي جدول عام / متدرب',
  adminSecretary: 'سكرتارية وإداري',
};
