'use client';

import { useState } from 'react';
import Link from 'next/link';
import LogoPX from './LogoPX';
import InstallAppModal from './InstallAppModal';

export default function LandingNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  return (
    <>
      <header className="landing-nav" role="banner">
        <div className="landing-nav__container">
          {/* Brand Logo with PX Monogram */}
          <Link href="/" className="landing-nav__brand" aria-label="PIXAXIS Accueil">
            <LogoPX size={34} withText={true} />
          </Link>

          {/* Desktop Nav Links */}
          <nav className={`landing-nav__links ${mobileMenuOpen ? 'landing-nav__links--open' : ''}`} aria-label="Navigation principale">
            <li>
              <a 
                href="#features" 
                className="landing-nav__link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Fonctionnalités
              </a>
            </li>
            <li>
              <a 
                href="#how-it-works" 
                className="landing-nav__link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Comment ça marche
              </a>
            </li>
            <li>
              <a 
                href="#pricing" 
                className="landing-nav__link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tarifs
              </a>
            </li>
            <li>
              <a 
                href="#faq" 
                className="landing-nav__link"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </a>
            </li>
            <li>
              <a 
                href="#contact" 
                className="landing-nav__link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
            </li>

            {mobileMenuOpen && (
              <li style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setInstallModalOpen(true);
                  }}
                  className="landing-nav__login-link"
                  style={{ 
                    textAlign: 'center', 
                    background: 'rgba(0, 229, 255, 0.12)', 
                    border: '1px solid rgba(0, 229, 255, 0.35)', 
                    color: 'var(--color-accent)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '10px',
                    borderRadius: 'var(--radius-full)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Installer l'app</span>
                </button>
                <Link 
                  href="/connexion?redirect=/creer" 
                  className="landing-nav__cta-btn"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{ justifyContent: 'center' }}
                >
                  Créer une image →
                </Link>
              </li>
            )}
          </nav>

          {/* Action Group */}
          <div className="landing-nav__actions">
            {/* Bouton Installer l'app (visible uniquement sur desktop, rangé dans le menu sur mobile) */}
            <button 
              type="button" 
              onClick={() => setInstallModalOpen(true)} 
              className="landing-nav__login-link landing-nav__desktop-cta"
              title="Télécharger et installer l'application PIXAXIS"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Installer l'app</span>
            </button>

            {/* Bouton CTA Créer (visible uniquement sur desktop, rangé dans le menu sur mobile) */}
            <Link href="/connexion?redirect=/creer" className="landing-nav__cta-btn landing-nav__desktop-cta">
              <span>Créer</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>

            {/* Mobile menu toggle */}
            <button 
              type="button" 
              className="landing-nav__mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Modale d'installation pour iPhone, Android et Ordinateur */}
      <InstallAppModal 
        isOpen={installModalOpen} 
        onClose={() => setInstallModalOpen(false)} 
      />
    </>
  );
}

