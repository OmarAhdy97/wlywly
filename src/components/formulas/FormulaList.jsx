import React, { useState } from 'react';
import {
  ArrowRight,
  Search,
  Star,
  Edit3,
  Eye,
  FileText,
  Filter,
  Sparkles,
  ExternalLink
} from 'lucide-react';

export default function FormulaList({
  categoryTitle = '',
  formulas = [],
  onSelectFormula,
  onBack,
  favorites = [],
  onToggleFavorite,
  isGlobalSearch = false,
  isFavoritesView = false
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Filter formulas by local search and type
  const filteredFormulas = formulas.filter(f => {
    const matchesSearch = !localSearch ||
      f.title.toLowerCase().includes(localSearch.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(localSearch.toLowerCase())) ||
      (f.keywords && f.keywords.some(k => k.toLowerCase().includes(localSearch.toLowerCase()))) ||
      (f.source_content && f.source_content.toLowerCase().includes(localSearch.toLowerCase()));

    const matchesType = selectedType === 'ALL' || f.type === selectedType;

    return matchesSearch && matchesType;
  });

  return (
    <div>
      {/* Category Header & Breadcrumbs */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '1.25rem 1.5rem',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.25rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        {/* Breadcrumb Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          marginBottom: '0.75rem'
        }}>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
          >
            ← كافة الأقسام
          </button>
          <span>/</span>
          <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
            {isFavoritesView ? 'الصيغ المفضلة' : (isGlobalSearch ? 'نتائج البحث' : categoryTitle)}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>
              {isFavoritesView ? '⭐ الصيغ المفضلة لديك' : (isGlobalSearch ? `نتائج البحث (${filteredFormulas.length})` : categoryTitle)}
            </h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              اختر الصيغة التي تريد إعدادها وتوليد المستند الخاص بها:
            </p>
          </div>

          <div style={{
            fontSize: '0.85rem',
            fontWeight: '700',
            background: 'var(--bg-card-subtle)',
            padding: '0.35rem 0.85rem',
            borderRadius: '20px',
            border: '1px solid var(--border-color)'
          }}>
            {filteredFormulas.length} صيغة متوفرة
          </div>
        </div>

        {/* Local Search within Category */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            flex: 1,
            minWidth: '220px',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-app)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '0.45rem 0.85rem'
          }}>
            <Search size={18} style={{ color: 'var(--accent-gold)', marginLeft: '0.5rem', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={`البحث داخل ${categoryTitle || 'الصيغ'} بالاسم أو الكلمة المفتاحية...`}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                fontFamily: 'inherit'
              }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="btn btn-secondary btn-icon"
                style={{ width: '22px', height: '22px', padding: 0, fontSize: '0.7rem' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Formulas Cards Grid */}
      {filteredFormulas.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-color)',
          color: 'var(--text-muted)'
        }}>
          <FileText size={45} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-main)' }}>لا توجد صيغ مطابقة لبحثك</h3>
          <p style={{ fontSize: '0.88rem', margin: '0.4rem 0 0 0' }}>جرب كتابة كلمة أخرى أو تصفح الأقسام الأخرى.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2rem'
        }}>
          {filteredFormulas.map(formula => {
            const isFav = favorites.includes(formula.id);

            return (
              <div
                key={formula.id}
                style={{
                  background: 'var(--bg-card)',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Top Badges & Favorite Button */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.65rem'
                  }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'var(--primary-100)', color: 'var(--primary-800)', fontSize: '0.75rem' }}>
                        {formula.category}
                      </span>
                      {formula.type === 'checklist' && (
                        <span className="badge" style={{ background: 'rgba(219, 39, 119, 0.1)', color: '#db2777', fontSize: '0.75rem' }}>
                          قائمة تفقدية
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(formula.id)}
                      className="btn btn-secondary btn-icon"
                      style={{
                        width: '32px',
                        height: '32px',
                        padding: 0,
                        color: isFav ? '#eab308' : 'var(--text-muted)'
                      }}
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
                    >
                      <Star size={16} fill={isFav ? '#eab308' : 'none'} />
                    </button>
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: '1.05rem',
                    fontWeight: '800',
                    color: 'var(--text-main)',
                    lineHeight: '1.5',
                    margin: '0 0 0.5rem 0'
                  }}>
                    {formula.title}
                  </h3>

                  {/* Excerpt */}
                  <p style={{
                    margin: '0 0 0.85rem 0',
                    fontSize: '0.83rem',
                    color: 'var(--text-muted)',
                    lineHeight: '1.6',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {formula.description}
                  </p>
                </div>

                {/* Bottom Actions */}
                <div style={{
                  paddingTop: '0.85rem',
                  borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.05))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formula.fields?.length || 0} حقول مطلوبة
                  </span>

                  <button
                    type="button"
                    onClick={() => onSelectFormula(formula)}
                    className="btn btn-gold btn-sm"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontWeight: 'bold',
                      padding: '0.45rem 0.9rem'
                    }}
                  >
                    <Edit3 size={15} />
                    <span>إعداد الصيغة</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
