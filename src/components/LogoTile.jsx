import { useState } from 'react';
import './LogoTile.css';

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
  const fallbackText = fallback ?? item.fallback ?? item.logo ?? item.universityLogo ?? item.hostLogo ?? item.shortName ?? item.name ?? 'SP';
  const accessibleName = alt ?? item.name ?? item.university ?? item.host ?? item.shortName ?? fallbackText;
  const background = tileStyle.background ?? '#FFFFFF';
  const padding = tileStyle.padding ?? '7px';
  const textColor = tileStyle.color ?? getReadableTextColor(background);

  return (
    <div
      className={`logo-tile ${loaded && !failed ? 'has-loaded-image' : ''} ${className}`}
      style={{
        '--logo-tile-bg': background,
        '--logo-tile-color': textColor,
        '--logo-tile-padding': padding,
        '--logo-tile-radius': sizeToCss(radius),
        '--logo-tile-size': sizeToCss(size),
      }}
      title={accessibleName}
    >
      <span className="logo-tile__fallback" aria-hidden={imageUrl && loaded && !failed ? 'true' : undefined}>
        {fallbackText}
      </span>
      {imageUrl && !failed ? (
        <img
          className={`logo-tile__img ${loaded ? 'is-loaded' : ''}`}
          src={imageUrl}
          alt={accessibleName}
          decoding="async"
          loading="eager"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}

function getReadableTextColor(background) {
  if (!/^#[0-9a-f]{6}$/i.test(background)) return '#111118';

  const red = parseInt(background.slice(1, 3), 16);
  const green = parseInt(background.slice(3, 5), 16);
  const blue = parseInt(background.slice(5, 7), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? '#111118' : '#ffffff';
}
