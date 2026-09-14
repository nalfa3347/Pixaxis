'use client';

import { useEffect } from 'react';

/**
 * AccountModal — Modal d'informations du compte utilisateur.
 */
export default function AccountModal({ onClose, credits = 0, userEmail = '', userId = '', isAdmin = false }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" style={{ maxWidth: '440px', width: '92%' }}>
        <button className="modal-dialog__close" onClick={onClose} aria-label="Fermer">✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: 'var(--space-md)' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', margin: 0, color: 'var(--color-text-primary)' }}>
            Mon Compte
          </h2>
          {isAdmin && (
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid rgba(0, 229, 255, 0.4)' }}>
              🛡️ Admin
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Adresse e-mail</div>
            <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)', wordBreak: 'break-all' }}>
              {userEmail || 'Non renseigné'}
            </div>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Identifiant utilisateur</div>
            <div style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: 'var(--color-accent)', wordBreak: 'break-all' }}>
              {userId || 'Session locale'}
            </div>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                {isAdmin ? 'Privilèges de création' : 'Solde de crédits'}
              </div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                {isAdmin ? 'Accès Illimité (Gratuit)' : `${credits.toLocaleString('fr-FR')} crédits`}
              </div>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: isAdmin ? 'rgba(0, 229, 255, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: isAdmin ? '#00E5FF' : '#10B981', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
              {isAdmin ? 'Admin' : 'Actif'}
            </span>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Langue de l'interface</div>
            <div style={{ color: 'var(--color-text-primary)', fontSize: 'var(--text-sm)' }}>Français (Afrique de l'Ouest)</div>
          </div>
        </div>

        <button 
          className="btn btn--secondary btn--full" 
          onClick={onClose}
          style={{ marginTop: 'var(--space-lg)' }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
