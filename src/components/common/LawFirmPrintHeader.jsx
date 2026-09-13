import React from 'react';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useData } from '../../context/DataContext';

/**
 * LawFirmDefaultLogo
 * Simple, elegant Law Scale vector emblem (ميزان بسيط فقط)
 */
export function LawFirmDefaultLogo({ size = 54, color = '#37040a' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Central Post */}
      <line x1="32" y1="12" x2="32" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {/* Top Finial Ring */}
      <circle cx="32" cy="11" r="3.5" stroke={color} strokeWidth="2" fill="none" />
      
      {/* Horizontal Crossbeam */}
      <line x1="13" y1="20" x2="51" y2="20" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      {/* Center Pivot Hub */}
      <circle cx="32" cy="20" r="3" fill={color} />

      {/* Left Scale Strings & Pan */}
      <line x1="16" y1="20" x2="10" y2="37" stroke={color} strokeWidth="1.3" />
      <line x1="16" y1="20" x2="22" y2="37" stroke={color} strokeWidth="1.3" />
      <line x1="16" y1="20" x2="16" y2="37" stroke={color} strokeWidth="1.3" />
      <path d="M 8 37 Q 16 45 24 37 Z" fill={color} />
      <rect x="7" y="36" width="18" height="1.5" rx="0.75" fill={color} />

      {/* Right Scale Strings & Pan */}
      <line x1="48" y1="20" x2="42" y2="37" stroke={color} strokeWidth="1.3" />
      <line x1="48" y1="20" x2="54" y2="37" stroke={color} strokeWidth="1.3" />
      <line x1="48" y1="20" x2="48" y2="37" stroke={color} strokeWidth="1.3" />
      <path d="M 40 37 Q 48 45 56 37 Z" fill={color} />
      <rect x="39" y="36" width="18" height="1.5" rx="0.75" fill={color} />

      {/* Stepped Pedestal Base */}
      <path d="M 22 52 C 25 49 29 48 32 48 C 35 48 39 49 42 52 Z" fill={color} />
      <rect x="18" y="52" width="28" height="3" rx="1.5" fill={color} />
      <rect x="14" y="55" width="36" height="2.5" rx="1.2" fill={color} />
    </svg>
  );
}

/**
 * LawFirmPrintHeader
 * Official printable letterhead arranged matching the requested layout:
 * - Left: Logo on top, Office Name, Lawyer Title, decorative line, Slogan
 * - Right: Contact info (Address, Phone, Email) with artistic watermark
 */
export default function LawFirmPrintHeader({ customProfile = null, className = '' }) {
  const { officeProfile } = useData();
  const profile = customProfile || officeProfile || {};

  return (
    <div className={`law-firm-print-header ${className}`} style={{
      position: 'relative',
      paddingBottom: '0.85rem',
      marginBottom: '1rem',
      borderBottom: '2.5px solid #37040a',
      direction: 'rtl',
      flexShrink: 0,
      width: '100%',
    }}>
      {/* Faint Artistic Simple Scale Watermark on the Right Side */}
      <div style={{
        position: 'absolute',
        right: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        opacity: 0.06,
        pointerEvents: 'none',
        zIndex: 0,
      }}>
        <svg width="125" height="110" viewBox="0 0 64 64" fill="none">
          {/* Central Post */}
          <line x1="32" y1="8" x2="32" y2="54" stroke="#37040a" strokeWidth="2.8" strokeLinecap="round" />
          {/* Top Finial Ring */}
          <circle cx="32" cy="7" r="3.2" stroke="#37040a" strokeWidth="1.8" fill="none" />
          
          {/* Horizontal Crossbeam */}
          <line x1="12" y1="17" x2="52" y2="17" stroke="#37040a" strokeWidth="2.4" strokeLinecap="round" />
          {/* Center Pivot Hub */}
          <circle cx="32" cy="17" r="2.8" fill="#37040a" />

          {/* Left Scale Strings & Pan */}
          <line x1="15" y1="17" x2="9" y2="35" stroke="#37040a" strokeWidth="1.2" />
          <line x1="15" y1="17" x2="21" y2="35" stroke="#37040a" strokeWidth="1.2" />
          <line x1="15" y1="17" x2="15" y2="35" stroke="#37040a" strokeWidth="1.2" />
          <path d="M 7 35 Q 15 44 23 35 Z" fill="#37040a" />
          <rect x="6" y="34.2" width="18" height="1.6" rx="0.8" fill="#37040a" />

          {/* Right Scale Strings & Pan */}
          <line x1="49" y1="17" x2="43" y2="35" stroke="#37040a" strokeWidth="1.2" />
          <line x1="49" y1="17" x2="55" y2="35" stroke="#37040a" strokeWidth="1.2" />
          <line x1="49" y1="17" x2="49" y2="35" stroke="#37040a" strokeWidth="1.2" />
          <path d="M 41 35 Q 49 44 57 35 Z" fill="#37040a" />
          <rect x="40" y="34.2" width="18" height="1.6" rx="0.8" fill="#37040a" />

          {/* Stepped Pedestal Base */}
          <path d="M 22 54 C 25 51 29 50 32 50 C 35 50 39 51 42 54 Z" fill="#37040a" />
          <rect x="18" y="54" width="28" height="3" rx="1.5" fill="#37040a" />
          <rect x="14" y="57" width="36" height="2.5" rx="1.2" fill="#37040a" />
        </svg>
      </div>

      <div className="law-firm-header-content" style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
      }}>
        {/* Right Side (First in RTL flow): Contact Information */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.35rem',
          fontSize: '0.84rem',
          color: '#37040a',
          textAlign: 'right',
        }}>
          {profile.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={14} style={{ color: '#6d0f1b', flexShrink: 0 }} />
              <span className="contact-address" style={{ fontWeight: '700', color: '#37040a' }}>{profile.address}</span>
            </div>
          )}

          {profile.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={14} style={{ color: '#6d0f1b', flexShrink: 0 }} />
              <span className="contact-phone" dir="ltr" style={{ fontWeight: '700', direction: 'ltr', color: '#37040a' }}>
                {profile.phone.startsWith('+') ? profile.phone : `+20 ${profile.phone}`}
              </span>
            </div>
          )}

          {profile.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Mail size={14} style={{ color: '#6d0f1b', flexShrink: 0 }} />
              <span className="contact-email" dir="ltr" style={{ fontWeight: '600', color: '#6d0f1b' }}>{profile.email}</span>
            </div>
          )}
        </div>

        {/* Left Side (Second in RTL flow): Vertical Stack (Logo -> Office Name -> Title -> Divider -> Slogan) */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          minWidth: 'min(100%, 240px)',
        }}>
          {/* Logo / Emblem on top */}
          <div style={{
            width: '60px',
            height: '56px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.35rem',
          }}>
            {profile.logo_url ? (
              <img
                src={profile.logo_url}
                alt="شعار المكتب"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            ) : (
              <LawFirmDefaultLogo size={54} color="#37040a" />
            )}
          </div>

          {/* Office Name */}
          <h2 style={{
            margin: 0,
            fontSize: '1.24rem',
            fontWeight: '900',
            color: '#37040a',
            lineHeight: 1.25,
            fontFamily: "'Alexandria', 'Cairo', 'Tahoma', sans-serif",
          }}>
            {profile.office_name || 'مكتب المحاماة والاستشارات القانونية'}
          </h2>

          {/* Lawyer Title / Credential */}
          <div style={{
            fontSize: '0.82rem',
            fontWeight: '700',
            color: '#6d0f1b',
            marginTop: '0.15rem',
          }}>
            {profile.lawyer_title || 'محامون ومستشارون قانونيون'}
          </div>

          {/* Subtle Decorative Line Under Title */}
          <div style={{
            width: '110px',
            height: '1.5px',
            backgroundColor: '#37040a',
            opacity: 0.35,
            margin: '0.35rem auto 0.25rem',
          }}></div>

          {/* Slogan */}
          {profile.slogan && (
            <div style={{
              fontSize: '0.74rem',
              fontWeight: '600',
              color: '#6b4c51',
              letterSpacing: '0.3px',
            }}>
              {profile.slogan}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
