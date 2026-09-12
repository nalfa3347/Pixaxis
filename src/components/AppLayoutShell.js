'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { supabase } from '@/lib/supabase-client';

/**
 * AppLayoutShell — Enveloppe conditionnelle du layout.
 * Si l'utilisateur est sur la page d'accueil (Landing page '/'),
 * on n'affiche pas la sidebar/header/bottom-nav de l'application interne,
 * ce qui laisse le plein écran à la Landing Page avec sa propre navbar et footer.
 * Sur les pages de l'application ('/creer', '/mes-images', '/profil'),
 * le shell applicatif complet est affiché.
 * 
 * Gestion PWA / App Installée :
 * Si l'application est lancée en mode installé (standalone / écran d'accueil iPhone ou Android),
 * elle affiche immédiatement la page de connexion (/connexion) ou le studio (/creer).
 */
export default function AppLayoutShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Détecter si l'application est ouverte depuis l'écran d'accueil (mode application installée)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone && pathname === '/') {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          router.replace('/creer');
        } else {
          router.replace('/connexion');
        }
      });
    }
  }, [pathname, router]);
  const publicRoutes = [
    '/',
    '/mentions-legales',
    '/cgu',
    '/politique-de-confidentialite',
    '/confidentialite',
    '/connexion',
  ];
  const isPublicPage = publicRoutes.includes(pathname) || pathname.startsWith('/connexion');

  if (isPublicPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <Header />
      <main className="app-main">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
