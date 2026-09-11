'use client';

import { useEffect } from 'react';

/**
 * AccountModal — Modal d'informations du compte utilisateur.
 */
export default function AccountModal({ onClose, credits = 0 }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog">
        <button className="modal-dialog__close" onClick={onClose} aria-label="Fermer">✕</button>

        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-md)', color: 'var(--color-text-primary)' }}>
          Mon Compte
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Adresse e-mail</div>
            <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>client@pixaxis.ai</div>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Identifiant utilisateur</div>
            <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'monospace', color: 'var(--color-accent)' }}>
              00000000-0000-0000-0000-000000000001
            </div>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 2 }}>Solde de crédits</div>
              <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                {credits.toLocaleString('fr-FR')} crédits
              </div>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', background: 'rgba(0, 229, 255, 0.1)', color: 'var(--color-accent)', borderRadius: 'var(--radius-full)' }}>
              Actif
            </span>
          </div>

          <div style={{ padding: 'var(--space-md)', background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 4 }}>Langue de l'interface</div>
            <div style={{ color: 'var(--color-text-primary)' }}>Français (Afrique de l'Ouest)</div>
          </div>
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
