'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LogoPX from '@/components/LogoPX';
import { usePixaxis } from '@/context/PixaxisContext';
import './admin.css';

const NAV_ITEMS = [
  {
    path: '/admin',
    exact: true,
    label: 'Tableau de bord',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/admin/users',
    label: 'Utilisateurs & Crédits',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    path: '/admin/payments',
    label: 'Paiements FedaPay',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    path: '/admin/credits',
    label: 'Crédits & Grand Livre',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-7 0c0 4 7 2 7 6a3.5 3.5 0 0 1-7 0" />
      </svg>
    ),
  },
  {
    path: '/admin/generations',
    label: 'Générations IA',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    path: '/admin/audit',
    label: 'Journal d’audit',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const { getAuthHeaders, user, authInitialized, isAdmin: contextIsAdmin } = usePixaxis();

  const [isAdmin, setIsAdmin] = useState(null); // null = checking, true = authorized, false = forbidden
  const [adminEmail, setAdminEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Vérification de sécurité serveur stricte
  useEffect(() => {
    let isMounted = true;

    async function checkAdminStatus() {
      // Si l'utilisateur n'est pas encore connecté, le marquer directement comme non connecté
      if (!user) {
        if (isMounted) {
          setIsAdmin(false);
          setErrorMessage('Veuillez vous connecter avec votre compte administrateur.');
        }
        return;
      }

      try {
        const res = await fetch('/api/admin/check', {
          headers: getAuthHeaders(),
        });
        const data = await res.json();

        if (isMounted) {
          if (res.ok && data.isAdmin) {
            setIsAdmin(true);
            setAdminEmail(data.email || user?.email || '');
          } else {
            setIsAdmin(false);
            setErrorMessage(data.error || 'Accès refusé. Ce compte ne dispose pas des privilèges administrateur.');
          }
        }
      } catch (err) {
        if (isMounted) {
          // Si le client sait déjà que l'utilisateur est admin, autoriser en fallback réseau
          if (contextIsAdmin) {
            setIsAdmin(true);
            setAdminEmail(user?.email || '');
          } else {
            setIsAdmin(false);
            setErrorMessage('Erreur réseau lors du contrôle administrateur.');
          }
        }
      }
    }

    if (authInitialized) {
      checkAdminStatus();
    }
  }, [authInitialized, getAuthHeaders, user, contextIsAdmin]);

  // 1. Écran de chargement sécurisé
  if (isAdmin === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#AAAAAA' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(0, 229, 255, 0.2)', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', letterSpacing: '0.05em' }}>Vérification des autorisations administrateur...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // 2. Écran d'accès refusé ou non-connecté
  if (isAdmin === false) {
    const isUnauthenticated = !user;

    return (
      <div style={{ minHeight: '100vh', background: '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: 480, width: '100%', background: '#0A0A0A', border: '1px solid #222222', borderRadius: 16, padding: '2.5rem', textAlign: 'center', boxShadow: '0 0 35px rgba(0, 0, 0, 0.8)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: isUnauthenticated ? 'rgba(0, 229, 255, 0.1)' : 'rgba(239, 68, 68, 0.1)', border: isUnauthenticated ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', color: isUnauthenticated ? '#00E5FF' : '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 32, height: 32 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ color: '#FFFFFF', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.75rem 0' }}>
            {isUnauthenticated ? 'Connexion Requise' : 'Accès Administrateur Refusé'}
          </h1>
          <p style={{ color: '#888888', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 1.75rem 0' }}>
            {isUnauthenticated 
              ? 'Vous devez être connecté avec votre compte administrateur (nasserpillar4@gmail.com) pour accéder à cette zone.'
              : (errorMessage || `Le compte connecté (${user?.email || user?.id}) ne dispose pas des droits administrateur.`)}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="admin-btn admin-btn--secondary">
              ← Retour à l’accueil
            </Link>
            <Link href="/connexion?redirect=/admin" className="admin-btn admin-btn--primary" style={{ background: '#00E5FF', color: '#000', fontWeight: 700 }}>
              {isUnauthenticated ? 'Se connecter en admin →' : 'Changer de compte →'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Espace Admin Authentifié et Autorisé
  return (
    <div className="admin-container">
      {/* Barre supérieure épinglée */}
      <header className="admin-header">
        <div className="admin-header__brand">
          <Link href="/admin" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
            <LogoPX size={26} withText={true} />
          </Link>
          <span className="admin-badge">
            <span className="admin-badge__dot" />
            Espace Admin
          </span>
        </div>

        <div className="admin-header__actions">
          {adminEmail && (
            <div className="admin-user-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, color: '#00E5FF' }}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>Connecté :</span>
              <strong>{adminEmail}</strong>
            </div>
          )}

          <Link href="/creer" className="admin-btn admin-btn--secondary admin-btn--sm">
            ← Studio PIXAXIS
          </Link>
        </div>
      </header>

      {/* Navigation Mobile Horizontale */}
      <nav className="admin-mobile-nav" aria-label="Navigation admin mobile">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact 
            ? pathname === item.path 
            : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`admin-mobile-nav__link ${isActive ? 'admin-mobile-nav__link--active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Corps Principal avec Barre Latérale Desktop */}
      <div className="admin-shell">
        <aside className="admin-nav" aria-label="Navigation admin desktop">
          <div style={{ padding: '0 0.5rem 1rem 0.5rem', borderBottom: '1px solid #161616', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#555555', fontWeight: 700 }}>
              Console de Gestion
            </span>
          </div>

          {NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? pathname === item.path 
              : pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`admin-nav__link ${isActive ? 'admin-nav__link--active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #161616' }}>
            <div style={{ padding: '0.5rem 0.75rem', background: '#0D0D0D', borderRadius: 8, border: '1px solid #1C1C1C' }}>
              <div style={{ fontSize: '0.75rem', color: '#888888', marginBottom: '0.2rem' }}>Moteur IA Actif :</div>
              <div style={{ fontSize: '0.82rem', color: '#00E5FF', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                IDEOGRAM 4.0
              </div>
            </div>
          </div>
        </aside>

        <main className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
