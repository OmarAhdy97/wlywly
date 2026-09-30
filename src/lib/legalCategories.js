/**
 * Legal Categories — Single Source of Truth
 * 
 * All category definitions live here. Both the validator and UI components
 * import from this file, eliminating duplication.
 */

import {
  FileText,
  FileCheck,
  Scale,
  Briefcase,
  AlertTriangle,
  HelpCircle,
  Send,
  Users,
  FolderArchive,
  Bell
} from 'lucide-react';

export const LEGAL_CATEGORIES = [
  {
    id: 'عرائض',
    label: 'عرائض',
    icon: FileText,
    color: '#9e2f5e',
    bgColor: 'rgba(158, 47, 94, 0.08)',
    description: 'صحف الدعاوى والطعون المدنية والتجارية والإدارية ومحاكم مجلس الدولة.',
    legal_area: 'مدني',
    order: 1
  },
  {
    id: 'عقود',
    label: 'عقود',
    icon: FileCheck,
    color: '#0d9488',
    bgColor: 'rgba(13, 148, 136, 0.08)',
    description: 'عقود البيع والإيجار والشركات والشراكة والصلح والوكالات والاتفاقات.',
    legal_area: 'مدني',
    order: 2
  },
  {
    id: 'جنح مباشرة',
    label: 'جنح مباشرة',
    icon: Scale,
    color: '#e11d48',
    bgColor: 'rgba(225, 29, 72, 0.08)',
    description: 'صحف الجنح المباشرة وخيانة الأمانة والشيكات والنصب والسب والقذف.',
    legal_area: 'جنائي',
    order: 3
  },
  {
    id: 'طلبات',
    label: 'طلبات',
    icon: Briefcase,
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.08)',
    description: 'أوامر الأداء والأوامر على عرائض والالتماسات وطلبات الصرف والتسليم.',
    legal_area: 'مدني',
    order: 4
  },
  {
    id: 'إنذارات',
    label: 'إنذارات',
    icon: Bell,
    color: '#dc2626',
    bgColor: 'rgba(220, 38, 38, 0.08)',
    description: 'إنذارات التكليف بالوفاء، إنذارات الإخلاء، إنذارات العرض والإيداع الرسمي.',
    legal_area: 'مدني',
    order: 5
  },
  {
    id: 'تظلمات',
    label: 'تظلمات',
    icon: AlertTriangle,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.08)',
    description: 'التظلمات القضائية والإدارية من الأوامر الوقتية وقرارات الحيازة.',
    legal_area: 'إداري',
    order: 6
  },
  {
    id: 'إشكالات',
    label: 'إشكالات',
    icon: HelpCircle,
    color: '#ea580c',
    bgColor: 'rgba(234, 88, 12, 0.08)',
    description: 'إشكالات وقف التنفيذ المدنية والجنائية أمام قاضي الأمور المستعجلة.',
    legal_area: 'تنفيذ',
    order: 7
  },
  {
    id: 'إعلانات',
    label: 'إعلانات',
    icon: Send,
    color: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.08)',
    description: 'إعلانات افتتاح الخصومة، إعادة الإعلان، إعلان شواهد التزوير، وتجديد الدعاوى.',
    legal_area: 'إجراءات',
    order: 8
  },
  {
    id: 'تجهيز ملف أسرة',
    label: 'تجهيز ملف أسرة',
    icon: Users,
    color: '#db2777',
    bgColor: 'rgba(219, 39, 119, 0.08)',
    description: 'دعاوى النفقات، الحضانة، الرؤية، الخلع، الطلاق، وقوائم المستندات المطلوبة.',
    legal_area: 'أحوال شخصية',
    order: 9
  },
  {
    id: 'حافظة مستندات',
    label: 'حافظة مستندات',
    icon: FolderArchive,
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.08)',
    description: 'نماذج حوافظ المستندات القضائية للمدعي والمدعى عليه مع جداول المستندات.',
    legal_area: 'إجراءات',
    order: 10
  }
];

/** Backward-compatible: array of category name strings */
export const VALID_CATEGORIES = LEGAL_CATEGORIES.map(c => c.id);

/** Backward-compatible: { [categoryName]: { icon, color, bgColor, desc } } */
export const CATEGORY_META = Object.fromEntries(
  LEGAL_CATEGORIES.map(c => [c.id, {
    icon: c.icon,
    color: c.color,
    bgColor: c.bgColor,
    desc: c.description
  }])
);

/** Map category name to legal_area */
export function inferLegalArea(category) {
  const cat = LEGAL_CATEGORIES.find(c => c.id === category);
  return cat ? cat.legal_area : 'عام';
}

/** Get category metadata by id */
export function getCategoryMeta(categoryId) {
  return LEGAL_CATEGORIES.find(c => c.id === categoryId) || null;
}
