'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { PAGES } from '@/config/constants';
import dynamic from 'next/dynamic';
import { usePixaxis } from '@/context/PixaxisContext';

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
  const { isAdmin } = usePixaxis();

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
          {isAdmin && (
            <Link
              href="/admin"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.35rem 0.8rem',
                background: 'rgba(0, 229, 255, 0.16)',
                border: '1px solid rgba(0, 229, 255, 0.55)',
                borderRadius: '9999px',
                color: '#00E5FF',
                fontSize: '0.78rem',
                fontWeight: 700,
                textDecoration: 'none',
                marginRight: '0.5rem',
                boxShadow: '0 0 12px rgba(0, 229, 255, 0.25)',
              }}
              title="Accéder à la console administrateur (Utilisateurs & Crédits)"
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00E5FF', boxShadow: '0 0 8px #00E5FF' }} />
              <span>🛡️ Admin • Utilisateurs & Crédits</span>
            </Link>
          )}
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
