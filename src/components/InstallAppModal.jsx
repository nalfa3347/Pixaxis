'use client';

import { useState, useEffect } from 'react';
import LogoPX from './LogoPX';

export default function InstallAppModal({ isOpen, onClose }) {
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // Détection iOS / iPhone / iPad
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);

      // Détection mode standalone (déjà installé)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      setIsInstalled(!!isStandalone);

      // Écoute de l'événement PWA standard (Android / Chrome / Edge)
      const handleBeforeInstallPrompt = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="install-modal-backdrop" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box'
      }}
    >
      <div 
        className="install-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#080808',
          border: '1px solid rgba(0, 229, 255, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 35px rgba(0, 229, 255, 0.15)',
          borderRadius: '18px',
          padding: '1.75rem 1.5rem',
          textAlign: 'center',
          boxSizing: 'border-box',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: 'none',
            color: '#FFFFFF',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem'
          }}
        >
          ✕
        </button>

        {/* Big PX Logo icon with glow */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <LogoPX size={64} withText={false} />
        </div>

        <h3 style={{
          fontFamily: 'var(--font-heading, sans-serif)',
          fontSize: '1.35rem',
          color: '#FFFFFF',
          margin: '0 0 0.35rem 0',
          fontWeight: 700
        }}>
          Installer l'application PIXAXIS
        </h3>

        <p style={{
          fontSize: '0.82rem',
          color: 'rgba(255, 255, 255, 0.65)',
          margin: '0 0 1.5rem 0',
          lineHeight: 1.4
        }}>
          Retrouvez PIXAXIS directement sur votre écran d'accueil avec son icône <strong>PX</strong> officielle, en plein écran et sans barre de navigation.
        </p>

        {/* Already installed case */}
        {isInstalled ? (
          <div style={{
            background: 'rgba(0, 229, 255, 0.08)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#FFFFFF'
          }}>
            ✓ L'application PIXAXIS est déjà installée sur votre appareil avec son icône PX.
          </div>
        ) : installSuccess ? (
          <div style={{
            background: 'rgba(39, 201, 63, 0.1)',
            border: '1px solid rgba(39, 201, 63, 0.4)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1rem',
            fontSize: '0.85rem',
            color: '#27C93F'
          }}>
            ✓ Installation confirmée ! L'icône PX est ajoutée à votre écran.
          </div>
        ) : isIOS ? (
          /* Instructions détaillées iPhone / iPad */
          <div style={{
            background: '#04060A',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.15rem 1rem',
            textAlign: 'left',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.82rem' }}>
              <span>📱 Sur iPhone & iPad (Safari) :</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{
                  background: 'rgba(0, 229, 255, 0.15)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.75rem'
                }}>1</span>
                <span>
                  Appuyez sur le bouton <strong>Partager</strong> (<span style={{ fontSize: '1rem' }}>⎋</span> ou carré avec flèche vers le haut au bas de l'écran).
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{
                  background: 'rgba(0, 229, 255, 0.15)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.75rem'
                }}>2</span>
                <span>
                  Faites défiler vers le bas et choisissez <strong>« Sur l'écran d'accueil »</strong> (icône <span style={{ fontSize: '0.9rem' }}>⊞</span>).
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{
                  background: 'rgba(0, 229, 255, 0.15)',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.75rem'
                }}>3</span>
                <span>
                  Appuyez sur <strong>« Ajouter »</strong> en haut à droite. L'icône <strong>PX</strong> s'affichera aussitôt sur votre écran !
                </span>
              </div>
            </div>
          </div>
        ) : deferredPrompt ? (
          /* Bouton natif Android / PC si prompt disponible */
          <div style={{ marginBottom: '1.25rem' }}>
            <button
              onClick={handleNativeInstall}
              style={{
                width: '100%',
                padding: '12px 20px',
                background: 'var(--color-accent)',
                color: '#000000',
                border: 'none',
                borderRadius: 'var(--radius-full, 9999px)',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                boxShadow: '0 0 20px rgba(0, 229, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Télécharger et installer l'app</span>
            </button>
          </div>
        ) : (
          /* Instructions Android / Navigateur standard */
          <div style={{
            background: '#04060A',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '14px',
            padding: '1.15rem 1rem',
            textAlign: 'left',
            marginBottom: '1.5rem',
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.85)',
            lineHeight: 1.45
          }}>
            <div style={{ color: 'var(--color-accent)', fontWeight: 600, marginBottom: '0.5rem' }}>
              🤖 Sur Android ou Ordinateur (Chrome / Edge) :
            </div>
            <div>
              1. Cliquez sur le menu du navigateur (les 3 points <strong>⋮</strong> en haut à droite).<br />
              2. Choisissez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.<br />
              3. Validez : l'icône <strong>PX</strong> sera immédiatement installée.
            </div>
          </div>
        )}

        {/* Action button */}
        <button 
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 18px',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 'var(--radius-full, 9999px)',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {isInstalled || installSuccess ? 'Fermer' : 'J\'ai compris'}
        </button>
      </div>
    </div>
  );
}
