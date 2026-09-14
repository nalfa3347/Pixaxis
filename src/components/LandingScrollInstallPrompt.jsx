'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import LogoPX from './LogoPX';

const InstallAppModal = dynamic(() => import('./InstallAppModal'), { ssr: false });

/**
 * LandingScrollInstallPrompt — Invite interactive d'installation de l'application
 * qui s'active automatiquement dès que l'utilisateur commence à défiler la landing page.
 */
export default function LandingScrollInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Vérifier si l'application est déjà installée
    const standalone = 
      (window.matchMedia && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      )) ||
      window.navigator.standalone === true ||
      document.documentElement.classList.contains('is-standalone-app');

    setIsStandalone(!!standalone);
    if (standalone) return;

    // 2. Vérifier si l'utilisateur a déjà masqué l'invite pendant cette session
    const isDismissed = sessionStorage.getItem('pixaxis_scroll_install_dismissed');
    if (isDismissed === 'true') {
      dismissedRef.current = true;
    }

    // 3. Capturer l'événement natif beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Détecter le défilement ("quand on scrolle un peu")
    const handleScroll = () => {
      if (dismissedRef.current || isStandalone) return;

      const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
      // Se déclenche dès 260px de défilement (dès que l'on quitte le haut de la landing page)
      if (scrollY > 260) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Vérifier au cas où la page est déjà scrollée
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    // Si l'événement natif est disponible (Android / Chrome), l'exécuter directement
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setShowPrompt(false);
          dismissedRef.current = true;
          sessionStorage.setItem('pixaxis_scroll_install_dismissed', 'true');
          return;
        }
      } catch (err) {
        console.warn('Erreur prompt natif:', err);
      }
    }
    // Sinon (iOS Safari, Firefox, ou fallback), ouvrir le guide d'installation visuel complet
    setModalOpen(true);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    dismissedRef.current = true;
    try {
      sessionStorage.setItem('pixaxis_scroll_install_dismissed', 'true');
    } catch (e) {}
  };

  if (isStandalone || !showPrompt) {
    return (
      <>
        {modalOpen && (
          <InstallAppModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <aside 
        className="landing-scroll-install-banner"
        role="dialog"
        aria-label="Installer l'application PIXAXIS"
      >
        <div className="landing-scroll-install-banner__glow" aria-hidden="true" />

        <div className="landing-scroll-install-banner__content">
          {/* Logo avec pulsation cyan */}
          <div className="landing-scroll-install-banner__icon-wrap">
            <LogoPX size={38} withText={false} />
            <span className="landing-scroll-install-banner__pulse" />
          </div>

          {/* Textes explicatifs percutants */}
          <div className="landing-scroll-install-banner__text">
            <div className="landing-scroll-install-banner__title">
              Installer l'application PIXAXIS
            </div>
            <div className="landing-scroll-install-banner__subtitle">
              Accès en 1 clic sur votre écran, chargement &lt; 1s et mode plein écran.
            </div>
          </div>

          {/* Bouton d'installation principal */}
          <div className="landing-scroll-install-banner__actions">
            <button
              type="button"
              onClick={handleInstallClick}
              className="landing-scroll-install-banner__btn-install"
              id="btn-scroll-install-app"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Installer</span>
            </button>

            {/* Bouton fermeture */}
            <button
              type="button"
              onClick={handleDismiss}
              className="landing-scroll-install-banner__btn-close"
              aria-label="Fermer cette suggestion"
              title="Plus tard"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>

      {modalOpen && (
        <InstallAppModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
