'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

/**
 * AppLayoutShell — Enveloppe conditionnelle du layout.
 * Si l'utilisateur est sur la page d'accueil (Landing page '/'),
 * on n'affiche pas la sidebar/header/bottom-nav de l'application interne,
 * ce qui laisse le plein écran à la Landing Page avec sa propre navbar et footer.
 * Sur les pages de l'application ('/creer', '/mes-images', '/profil'),
 * le shell applicatif complet est affiché.
 */
export default function AppLayoutShell({ children }) {
  const pathname = usePathname();
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
