import React from 'react';
import { Search, Star, FileText, FolderArchive, X } from 'lucide-react';
import { CATEGORY_META } from '../../lib/legalCategories';

export default function FormulaCategoryView({
  categories = [],
  categoryCounts = {},
  onSelectCategory,
  searchTerm,
  setSearchTerm,
  onOpenSavedDocs,
  savedDocsCount = 0,
  favoritesCount = 0,
  onShowFavorites,
}) {
  return (
    <div>
      <div className="page-head">
        <div>
          <h1>الصيغ القانونية</h1>
          <p className="page-sub">اختر القسم أو الصيغة لتوليد عريضة أو عقد أو إنذار جاهز للطباعة، وتُسحب بيانات الموكل والقضية تلقائياً.</p>
        </div>
        <div className="page-head-actions">
          <button type="button" onClick={onShowFavorites} className="btn btn-secondary">
            <Star size={16} />
            <span>المفضلة ({favoritesCount})</span>
          </button>
          <button type="button" onClick={onOpenSavedDocs} className="btn btn-secondary">
            <FolderArchive size={16} />
            <span>المستندات المحفوظة ({savedDocsCount})</span>
          </button>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search formula-search">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder="ابحث في كل الصيغ: نفقة صغار، طرد، إيصال أمانة، عقد إيجار، صحة توقيع"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button type="button" className="formula-search-clear" onClick={() => setSearchTerm('')} aria-label="مسح البحث">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="formula-category-grid">
        {categories.map((cat) => {
          const count = categoryCounts[cat] || 0;
          const meta = CATEGORY_META[cat] || { icon: FileText, desc: 'صيغ وقوالب قانونية متخصصة.' };
          const Icon = meta.icon || FileText;

          return (
            <button
              type="button"
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className="card formula-category-card"
            >
              <span className="formula-category-icon"><Icon size={22} /></span>
              <span className="formula-category-body">
                <span className="formula-category-title">{cat}</span>
                <span className="formula-category-desc">{meta.desc}</span>
              </span>
              <span className="formula-category-count">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
