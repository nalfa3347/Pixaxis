'use client';

import { useEffect } from 'react';

/**
 * NotificationDrawer — Panneau/Modal des notifications utilisateur.
 */
export default function NotificationDrawer({ onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const notifications = [
    {
      id: 1,
      title: 'Bienvenue sur PIXAXIS',
      message: 'Votre espace de création IA haut de gamme est prêt. Explorez les styles et formats.',
      time: 'Récemment',
      read: true,
      icon: '✨',
    },
    {
      id: 2,
      title: 'Optimisation de vos crédits',
      message: 'Vos crédits sont consommés selon la règle la plus avantageuse : le lot expirant le plus tôt est débité en premier.',
      time: 'Actif',
      read: true,
      icon: '🛡️',
    },
    {
      id: 3,
      title: 'File de génération glissante',
      message: 'Vous pouvez lancer jusqu\'à 10 générations simultanées. Les places se libèrent en temps réel.',
      time: 'Nouveau',
      read: false,
      icon: '⚡',
    }
  ];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" style={{ maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: '1.25rem', color: 'var(--color-accent)' }}>🔔</span>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', color: 'var(--color-text-primary)', margin: 0 }}>
              Notifications
            </h2>
          </div>
          <button 
            className="modal-dialog__close" 
            onClick={onClose} 
            aria-label="Fermer"
            style={{ position: 'static' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              style={{
                padding: 'var(--space-md)',
                borderRadius: 'var(--radius-md)',
                background: n.read ? 'var(--color-surface)' : 'rgba(0, 229, 255, 0.05)',
                border: n.read ? '1px solid var(--color-border)' : '1px solid rgba(0, 229, 255, 0.3)',
                display: 'flex',
                gap: 'var(--space-md)',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                fontSize: '1.2rem',
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--color-surface-hover)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {n.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                    {n.title}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>{n.time}</span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4 }}>
                  {n.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button 
          className="btn btn--secondary btn--full" 
          onClick={onClose}
          style={{ marginTop: 'var(--space-xl)' }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
