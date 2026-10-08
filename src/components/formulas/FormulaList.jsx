import React, { useState } from 'react';
import { Search, Star, Edit3, X } from 'lucide-react';

export default function FormulaList({
  categoryTitle = '',
  formulas = [],
  onSelectFormula,
  onBack,
  favorites = [],
  onToggleFavorite,
  isGlobalSearch = false,
  isFavoritesView = false,
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [selectedType] = useState('ALL');

  const q = localSearch.toLowerCase();
  const filteredFormulas = formulas.filter((f) => {
    const matchesSearch =
      !q ||
      f.title.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.keywords && f.keywords.some((k) => k.toLowerCase().includes(q))) ||
      (f.source_content && f.source_content.toLowerCase().includes(q));
    const matchesType = selectedType === 'ALL' || f.type === selectedType;
    return matchesSearch && matchesType;
  });

  const heading = isFavoritesView ? 'الصيغ المفضلة' : isGlobalSearch ? `نتائج البحث (${filteredFormulas.length})` : categoryTitle;

  return (
    <div>
      <div className="page-head">
        <div>
          <button type="button" onClick={onBack} className="formula-back">← كل الأقسام</button>
          <h1>{heading}</h1>
          <p className="page-sub">{filteredFormulas.length} صيغة. اختر الصيغة التي تريد إعدادها.</p>
        </div>
      </div>

      <div className="page-toolbar">
        <div className="page-search formula-search">
          <Search size={16} />
          <input
            type="text"
            className="form-input"
            placeholder={`البحث داخل ${categoryTitle || 'الصيغ'} بالاسم أو الكلمة المفتاحية`}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
          {localSearch && (
            <button type="button" className="formula-search-clear" onClick={() => setLocalSearch('')} aria-label="مسح البحث">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {filteredFormulas.length === 0 ? (
        <div className="card empty-block">
          <h3>لا توجد صيغ مطابقة</h3>
          <p>جرّب كلمة أخرى أو تصفّح الأقسام الأخرى.</p>
        </div>
      ) : (
        <div className="formula-grid">
          {filteredFormulas.map((formula) => {
            const isFav = favorites.includes(formula.id);
            const fieldCount = (formula.fields || []).filter((f) => f.type !== 'case').length;
            const required = (formula.fields || []).filter((f) => f.required).length;

            return (
              <article key={formula.id} className="card formula-card">
                <header className="formula-card-head">
                  <div className="formula-card-tags">
                    <span className="cell-sub">{formula.category}</span>
                    {formula.type === 'checklist' && <span className="badge">قائمة تفقدية</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(formula.id)}
                    className={`icon-btn formula-fav ${isFav ? 'is-on' : ''}`}
                    title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    aria-label={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    aria-pressed={isFav}
                  >
                    <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </header>

                <h3 className="formula-card-title">{formula.title}</h3>
                <p className="formula-card-desc">{formula.description}</p>

                <footer className="formula-card-foot">
                  <span className="cell-sub">{fieldCount} بيانًا · {required} أساسي</span>
                  <button type="button" onClick={() => onSelectFormula(formula)} className="btn btn-primary btn-sm">
                    <Edit3 size={14} />
                    <span>إعداد الصيغة</span>
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
