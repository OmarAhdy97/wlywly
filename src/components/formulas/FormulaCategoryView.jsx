import React from 'react';
import {
  Search,
  Bookmark,
  Sparkles,
  ArrowLeft,
  Star,
  FileText,
  FolderArchive
} from 'lucide-react';
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
  onShowFavorites
}) {
  return (
    <div>
      {/* Top Banner & Quick Controls */}
      <div style={{
        background: 'var(--bg-card)',
        padding: '1.75rem 2rem',
        borderRadius: 'var(--radius-lg, 16px)',
        border: '1px solid var(--border-color)',
        marginBottom: '1.75rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          position: 'relative',
          zIndex: 2
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.8rem',
              borderRadius: '20px',
              background: 'rgba(197, 160, 89, 0.15)',
              color: 'var(--primary-800)',
              fontSize: '0.82rem',
              fontWeight: '700',
              marginBottom: '0.6rem'
            }}>
              <Sparkles size={14} style={{ color: 'var(--accent-gold)' }} />
              <span>مكتبة ومولد المستندات القانونية الذكي</span>
            </div>

            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '900',
              color: 'var(--text-main)',
              margin: '0 0 0.4rem 0'
            }}>
              الصيغ القانونية والقضائية
            </h1>

            <p style={{
              margin: 0,
              fontSize: '0.95rem',
              color: 'var(--text-muted)',
              maxWidth: '650px',
              lineHeight: '1.6'
            }}>
              اختر القسم أو الصيغة المناسبة لتوليد عريضة أو عقد أو إنذار رسمي جاهز للطباعة فوراً، بسحب بيانات الموكل والقضية تلقائياً دون إعادة كتابة مكررة.
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onShowFavorites}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
            >
              <Star size={16} style={{ color: '#eab308' }} />
              <span>المفضلة ({favoritesCount})</span>
            </button>

            <button
              type="button"
              onClick={onOpenSavedDocs}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem' }}
            >
              <FolderArchive size={16} style={{ color: 'var(--accent-gold)' }} />
              <span>المستندات المحفوظة ({savedDocsCount})</span>
            </button>
          </div>
        </div>

        {/* Global Instant Search Bar */}
        <div style={{ marginTop: '1.5rem', position: 'relative' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-app)',
            border: '1.5px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.5rem 1rem',
            boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
          }}>
            <Search size={20} style={{ color: 'var(--accent-gold)', marginLeft: '0.75rem', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="ابحث في كامل مكتبة الصيغ (مثال: نفقة صغار، طرد، إيصال أمانة، عقد إيجار، صحة توقيع)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '0.95rem',
                color: 'var(--text-main)',
                fontFamily: 'inherit'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="btn btn-secondary btn-icon"
                style={{ width: '26px', height: '26px', padding: 0, fontSize: '0.75rem' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The 10 Categories Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {categories.map(cat => {
          const count = categoryCounts[cat] || 0;
          const meta = CATEGORY_META[cat] || {
            icon: FileText,
            color: 'var(--primary-700)',
            bgColor: 'rgba(55, 4, 10, 0.05)',
            desc: 'صيغ وقوالب قانونية متخصصة.'
          };
          const Icon = meta.icon;

          return (
            <div
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className="formula-category-card"
              style={{
                background: 'var(--bg-card)',
                borderRadius: '16px',
                border: '1.5px solid var(--border-color)',
                padding: '1.4rem',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div>
                {/* Header Icon + Count */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: meta.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: meta.color
                  }}>
                    <Icon size={24} />
                  </div>

                  <span style={{
                    background: 'var(--bg-card-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '800',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    border: '1px solid var(--border-color)'
                  }}>
                    {count} صيغة
                  </span>
                </div>

                {/* Title */}
                <h3 style={{
                  margin: '0 0 0.4rem 0',
                  fontSize: '1.18rem',
                  fontWeight: '800',
                  color: 'var(--text-main)'
                }}>
                  {cat}
                </h3>

                {/* Description */}
                <p style={{
                  margin: 0,
                  fontSize: '0.83rem',
                  color: 'var(--text-muted)',
                  lineHeight: '1.6'
                }}>
                  {meta.desc}
                </p>
              </div>

              {/* Bottom Arrow Action */}
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid var(--border-subtle, rgba(0,0,0,0.05))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: meta.color,
                fontWeight: '700',
                fontSize: '0.88rem'
              }}>
                <span>استعراض الصيغ</span>
                <ArrowLeft size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
