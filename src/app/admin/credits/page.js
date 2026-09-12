'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminCreditsPage() {
  const { getAuthHeaders } = usePixaxis();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCreditsLedger = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/credits', {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error('Erreur chargement crédits:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchCreditsLedger();
  }, [fetchCreditsLedger]);

  if (loading || !data) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#888' }}>
        Chargement du Grand Livre des crédits...
      </div>
    );
  }

  const { summary, ledger, lots } = data;

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Grand Livre des Crédits</h1>
          <p className="admin-page-subtitle">
            Cycle de vie complet des crédits : achats, attributions avec bonus, consommations et soldes en circulation.
          </p>
        </div>
      </div>

      {/* KPI Compteurs Globaux */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Crédits Distribués</span>
            <div className="kpi-card__icon">🪙</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#00E5FF' }}>
            {summary.total_attribues.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">
            Total acheté : {summary.total_achetes_fcfa.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Crédits Consommés</span>
            <div className="kpi-card__icon">⚡</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#EF4444' }}>
            {summary.total_consommes.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">
            Débités lors de générations confirmées
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">En Circulation (Restants)</span>
            <div className="kpi-card__icon">✓</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#10B981' }}>
            {summary.total_restants.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">
            Répartis sur {summary.lots_actifs_count} lot(s) actif(s)
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Crédits Expirés</span>
            <div className="kpi-card__icon">⏳</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#888' }}>
            {summary.total_expires.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">Validité dépassée (&gt; 3 à 12 mois)</div>
        </div>
      </div>

      {/* Grand Livre des Mouvements */}
      <div className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">
            📜 Journal des Mouvements Réents ({ledger.length})
          </h2>
          <span className="admin-section__badge">Traçabilité complète</span>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Utilisateur</th>
                <th>Opération</th>
                <th>Variation de crédits</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    Aucun mouvement de crédits enregistré.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontSize: '0.8rem', color: '#AAA' }}>
                      {new Date(row.date).toLocaleString('fr-FR')}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFF' }}>{row.user_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>{row.user_email}</div>
                    </td>
                    <td>
                      <span className="tag tag--neutral">{row.type_operation}</span>
                    </td>
                    <td>
                      {row.impact_type === 'credit' ? (
                        <span style={{ fontWeight: 700, color: '#10B981', fontSize: '0.95rem' }}>
                          +{row.montant_credits.toLocaleString('fr-FR')} crédits
                        </span>
                      ) : row.impact_type === 'debit' ? (
                        <span style={{ fontWeight: 700, color: '#EF4444', fontSize: '0.95rem' }}>
                          {row.montant_credits.toLocaleString('fr-FR')} crédits
                        </span>
                      ) : (
                        <span style={{ color: '#888' }}>{row.montant_credits} crédits</span>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#888' }}>
                      {row.reference ? String(row.reference).slice(0, 16) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
