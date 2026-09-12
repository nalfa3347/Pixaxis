'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PAGES } from '@/config/constants';
import dynamic from 'next/dynamic';

const SearchModal = dynamic(() => import('./SearchModal'), { ssr: false });
const NotificationDrawer = dynamic(() => import('./NotificationDrawer'), { ssr: false });

/**
 * Header — Barre du haut épinglée (sticky).
 * - Gauche : nom de la page actuelle (dynamique)
 * - Droite : icône cloche de notification et icône loupe de recherche
 */
export default function Header() {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Détermine le titre de la page courante
  const currentPage = PAGES.find(
    (page) => pathname === page.path || (page.path !== '/' && pathname.startsWith(page.path))
  );
  const pageTitle = currentPage?.label || 'PIXAXIS';

  return (
    <>
      <header className="header">
        <h1 className="header__title">{pageTitle}</h1>
        <div className="header__actions" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
          <button
            className="header__icon-btn"
            onClick={() => setNotificationsOpen(true)}
            aria-label="Notifications"
            style={{ position: 'relative' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--color-accent)',
              boxShadow: '0 0 6px var(--color-accent)',
            }} />
          </button>
          <button
            className="header__icon-btn"
            onClick={() => setSearchOpen(true)}
            aria-label="Rechercher"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>
      </header>

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
      {notificationsOpen && <NotificationDrawer onClose={() => setNotificationsOpen(false)} />}
    </>
  );
}
