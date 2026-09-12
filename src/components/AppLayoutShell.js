'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AppLayoutShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, authInitialized } = usePixaxis();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Détection exhaustive du mode application installée (PWA / Standalone / WebAPK / iOS WebClip)
    const isStandalone = 
      (window.matchMedia && (
        window.matchMedia('(display-mode: standalone)').matches || 
        window.matchMedia('(display-mode: fullscreen)').matches || 
        window.matchMedia('(display-mode: minimal-ui)').matches
      )) || 
      window.navigator.standalone === true ||
      (document.referrer && document.referrer.indexOf('android-app://') !== -1) ||
      document.documentElement.classList.contains('is-standalone-app');

    // 1. Application installée lancée sur la racine '/' -> Redirection vers la page de connexion ou le studio
    if (isStandalone && pathname === '/') {
      if (user) {
        router.replace('/creer');
      } else {
        router.replace('/connexion');
      }
      return;
    }

    // 2. Protection des pages internes du studio si l'utilisateur n'est pas authentifié
    if (authInitialized && !user) {
      const protectedRoutes = ['/creer', '/mes-images', '/profil'];
      const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(route + '/'));
      if (isProtected) {
        router.replace(`/connexion?redirect=${encodeURIComponent(pathname)}`);
      }
    }
  }, [pathname, router, user, authInitialized]);

  // Si on est en mode standalone sur la page d'accueil '/', bloquer l'affichage de la landing page
  const isStandaloneEnv = typeof window !== 'undefined' && (
    (window.matchMedia && (
      window.matchMedia('(display-mode: standalone)').matches || 
      window.matchMedia('(display-mode: fullscreen)').matches || 
      window.matchMedia('(display-mode: minimal-ui)').matches
    )) || 
    window.navigator.standalone === true ||
    (document.referrer && document.referrer.indexOf('android-app://') !== -1) ||
    document.documentElement.classList.contains('is-standalone-app')
  );

  if (isStandaloneEnv && pathname === '/') {
    return <div style={{ minHeight: '100vh', backgroundColor: '#000000' }} />;
  }

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
