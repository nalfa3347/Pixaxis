'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PAGES } from '@/config/constants';
import { usePixaxis } from '@/context/PixaxisContext';

/**
 * Navigation icons — inline SVGs, same as Sidebar for consistency.
 */
const NAV_ICONS = {
  images: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  create: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

/**
 * BottomNav — Mobile navigation (barre fixe en bas de l'écran).
 * Visible uniquement sur mobile (≤768px), masqué sur desktop via CSS.
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { isAdmin } = usePixaxis();

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Navigation mobile">
      {PAGES.map((page) => {
        const isActive = pathname === page.path || 
          (page.path !== '/' && pathname.startsWith(page.path));
        
        return (
          <Link
            key={page.id}
            href={page.path}
            className={`bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {NAV_ICONS[page.icon]}
            <span>{page.label}</span>
          </Link>
        );
      })}

      {isAdmin && (
        <Link
          href="/admin"
          className={`bottom-nav__link ${pathname.startsWith('/admin') ? 'bottom-nav__link--active' : ''}`}
          style={{ color: '#00E5FF' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22 }}>
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Admin</span>
        </Link>
      )}
    </nav>
  );
}
