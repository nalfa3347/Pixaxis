'use client';

export default function LogoPX({ size = 32, withText = true, className = '' }) {
  const iconSize = size;
  const borderRadius = Math.round(size * 0.24);

  return (
    <div className={`logo-px-container ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '9px' }}>
      <div 
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          borderRadius: `${borderRadius}px`,
          background: '#000000',
          border: '1px solid rgba(0, 229, 255, 0.45)',
          boxShadow: '0 0 14px rgba(0, 229, 255, 0.22)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
        aria-hidden="true"
      >
        <svg 
          width={Math.round(iconSize * 0.85)} 
          height={Math.round(iconSize * 0.85)} 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle cyan center ambient glow */}
          <circle cx="50" cy="50" r="35" fill="#00E5FF" opacity="0.1" />
          <g transform="translate(3, 0)">
            {/* Letter P in pure White #FFFFFF */}
            <path d="M 15,24 L 38,24 C 50,24 55,30 55,40 C 55,50 50,55 38,55 L 29,55 L 29,76 L 15,76 Z M 29,35 L 29,44 L 37,44 C 41,44 43,43 43,40 C 43,36 41,35 37,35 Z" fill="#FFFFFF"/>
            {/* Letter X in vibrant Cyan #00E5FF */}
            <path d="M 53,24 L 64,24 L 74,45 L 84,24 L 95,24 L 80,50 L 95,76 L 84,76 L 74,55 L 64,76 L 53,76 L 68,50 Z" fill="#00E5FF"/>
          </g>
        </svg>
      </div>

      {withText && (
        <span style={{
          fontFamily: 'var(--font-heading, "Space Grotesk", sans-serif)',
          fontSize: `${Math.max(16, Math.round(size * 0.65))}px`,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          color: '#FFFFFF',
          lineHeight: 1
        }}>
          PIX<span style={{ color: 'var(--color-accent, #00E5FF)' }}>AXIS</span>
        </span>
      )}
    </div>
  );
}
