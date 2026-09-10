import React from 'react';

/**
 * Reusable Logo component for API-Wallet.
 * Adapts dynamically to the workspace accent color via CSS custom property `--color-primary`.
 */
export function LogoIcon({ size = 32, color, className = '', style = {} }) {
  const fillColor = color || 'var(--logo-fill, var(--color-primary, #7c3aed))';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      aria-label="API-Wallet Logo"
      className={`api-wallet-logo-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        transition: 'all 0.25s ease',
        ...style,
      }}
    >
      {/* Outer rounded square with dynamic workspace accent color */}
      <rect width="40" height="40" rx="10" fill={fillColor} />
      {/* Wallet body */}
      <rect x="7" y="14" width="26" height="18" rx="3" fill="white" opacity="0.18" />
      <rect x="7" y="14" width="26" height="18" rx="3" stroke="white" strokeWidth="1.8" />
      {/* Wallet flap top */}
      <path d="M7 18h26V14a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3v4z" fill="white" opacity="0.28" />
      {/* Coin slot / key pocket */}
      <rect x="23" y="19" width="8" height="8" rx="2" fill="white" opacity="0.35" />
      <rect x="23" y="19" width="8" height="8" rx="2" stroke="white" strokeWidth="1.2" />
      {/* Center dot = API key symbol */}
      <circle cx="27" cy="23" r="1.5" fill="white" />
      {/* Left decorative lines = API endpoint representation */}
      <line x1="10" y1="21" x2="19" y2="21" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.8" />
      <line x1="10" y1="24" x2="17" y2="24" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
      <line x1="10" y1="27" x2="15" y2="27" stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export default LogoIcon;
