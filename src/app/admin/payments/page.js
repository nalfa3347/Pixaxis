'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminPaymentsPage() {
  const { getAuthHeaders } = usePixaxis();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({ montant_total_paye: 0, transactions_reussies: 0, transactions_echouees: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // all | reussi | en_attente | echoue
  const [periodFilter, setPeriodFilter] = useState('all'); // all | today | 7d | 30d

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (periodFilter !== 'all') params.set('period', periodFilter);

      const res = await fetch(`/api/admin/payments?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Erreur chargement paiements:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodFilter, getAuthHeaders]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Paiements & Transactions FedaPay</h1>
          <p className="admin-page-subtitle">
            Suivi des transactions Mobile Money et cartes bancaires, vérifications et attribution des crédits.
          </p>
        </div>
      </div>

      {/* KPI de tête */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Montant Total Encaissé</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value" style={{ color: '#10B981' }}>
            {summary.montant_total_paye.toLocaleString('fr-FR')} <span style={{ fontSize: '1rem', color: '#888' }}>FCFA</span>
          </div>
          <div className="kpi-card__sub">Total cumulé des paiements confirmés</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Transactions Réussies</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value" style={{ color: '#00E5FF' }}>
            {summary.transactions_reussies}
          </div>
          <div className="kpi-card__sub">Lots de crédits attribués avec succès</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Échouées ou En Attente</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value" style={{ color: '#EF4444' }}>
            {summary.transactions_echouees}
          </div>
          <div className="kpi-card__sub">Non débitées, aucun crédit attribué</div>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="admin-filter-bar">
        <div className="admin-filter-pills">
          <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center', marginRight: '0.2rem' }}>Statut :</span>
          {[
            { id: 'all', label: 'Tous' },
            { id: 'reussi', label: 'Réussis' },
            { id: 'en_attente', label: 'En attente' },
            { id: 'echoue', label: 'Échoués' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={`admin-filter-pill ${statusFilter === s.id ? 'admin-filter-pill--active' : ''}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="admin-filter-pills" style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.8rem', color: '#888', alignSelf: 'center', marginRight: '0.2rem' }}>Période :</span>
          {[
            { id: 'all', label: 'Tout l’historique' },
            { id: 'today', label: 'Aujourd’hui' },
            { id: '7d', label: '7 jours' },
            { id: '30d', label: '30 jours' },
          ].map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriodFilter(p.id)}
              className={`admin-filter-pill ${periodFilter === p.id ? 'admin-filter-pill--active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des paiements */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID FedaPay / Réf</th>
              <th>Client</th>
              <th>Forfait</th>
              <th>Montant</th>
              <th>Statut</th>
              <th>Date & Heure</th>
              <th>Crédits attribués</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Chargement des transactions...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Aucune transaction ne correspond aux filtres sélectionnés.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#00E5FF' }}>
                      {p.fedapay_transaction_id || p.id.slice(0, 8)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>{p.user_name}</div>
                    <div style={{ fontSize: '0.78rem', color: '#777' }}>{p.user_email}</div>
                  </td>
                  <td>
                    <span className="tag tag--neutral">{p.forfait}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: p.statut === 'reussi' ? '#10B981' : '#AAA' }}>
                    {p.montant_fcfa.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    {p.statut === 'reussi' ? (
                      <span className="tag tag--success">✓ Réussi</span>
                    ) : p.statut === 'en_attente' ? (
                      <span className="tag tag--warning">⏳ En attente</span>
                    ) : (
                      <span className="tag tag--danger">✕ Échoué</span>
                    )}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#AAA' }}>
                    {new Date(p.date).toLocaleString('fr-FR')}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#00E5FF' }}>
                      +{p.credits_attribues.toLocaleString('fr-FR')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
