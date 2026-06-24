import { useState } from 'react';
import './LogoTile.css';

const BRAND_COLORS = [
  '#1a56db', '#2563eb', '#0369a1', '#0891b2', '#0d9488',
  '#059669', '#16a34a', '#65a30d', '#ca8a04', '#d97706',
  '#ea580c', '#dc2626', '#e11d48', '#c026d3', '#9333ea',
  '#7c3aed', '#6366f1', '#4f46e5', '#2dd4bf', '#f59e0b',
  '#8b5cf6', '#06b6d4', '#10b981', '#f97316', '#ef4444',
  '#3b82f6', '#14b8a6', '#84cc16', '#eab308', '#a855f7',
];

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) - h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getBrandColor(name) {
  return BRAND_COLORS[hashName(name) % BRAND_COLORS.length];
}

function getInitials(name, shortName) {
  if (shortName && shortName.length <= 4) return shortName;

  const skip = ['of', 'the', 'and', 'at', 'in', 'for', 'de', 'del', 'di', 'des', 'du', 'la', 'le', 'van', 'von', 'zu'];
  const words = (name || '').split(/[\s-]+/).filter(w => !skip.includes(w.toLowerCase()));

  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
}

function sizeToCss(size) {
  return typeof size === 'number' ? `${size}px` : size;
}

export default function LogoTile({
  item = {},
  alt,
  className = '',
  fallback,
  logoStyle,
  logoUrl,
  radius = 12,
  size = 48,
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageUrl = logoUrl ?? item.logoUrl ?? item.universityLogoUrl ?? item.hostLogoUrl;
  const tileStyle = logoStyle ?? item.logoStyle ?? item.universityLogoStyle ?? item.hostLogoStyle ?? {};
  const uniName = item.name ?? item.university ?? item.host ?? '';
  const shortName = item.shortName ?? item.short_name ?? '';
  const fallbackText = fallback ?? item.fallback ?? item.logo ?? item.universityLogo ?? item.hostLogo ?? shortName ?? uniName ?? 'SP';
  const accessibleName = alt ?? uniName ?? shortName ?? fallbackText;

  const hasImage = imageUrl && !failed;
  const brandColor = getBrandColor(uniName || fallbackText);
  const initials = getInitials(uniName, shortName);

  const background = hasImage ? (tileStyle.background ?? '#FFFFFF') : brandColor;
  const padding = tileStyle.padding ?? '7px';
  const textColor = '#FFFFFF';

  return (
    <div
      className={`logo-tile ${loaded && !failed ? 'has-loaded-image' : ''} ${!hasImage ? 'logo-tile--generated' : ''} ${className}`}
      style={{
        '--logo-tile-bg': background,
        '--logo-tile-color': textColor,
        '--logo-tile-padding': padding,
        '--logo-tile-radius': sizeToCss(radius),
        '--logo-tile-size': sizeToCss(size),
      }}
      title={accessibleName}
    >
      <span className="logo-tile__fallback" aria-hidden={hasImage && loaded ? 'true' : undefined}>
        {hasImage ? fallbackText : initials}
      </span>
      {imageUrl && !failed ? (
        <img
          className={`logo-tile__img ${loaded ? 'is-loaded' : ''}`}
          src={imageUrl}
          alt={accessibleName}
          decoding="async"
          loading="eager"
          onLoad={e => {
            if (e.target.naturalWidth < 32) { setFailed(true); return; }
            setLoaded(true);
          }}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
