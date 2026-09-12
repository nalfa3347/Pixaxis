'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminDashboardPage() {
  const { getAuthHeaders } = usePixaxis();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/admin/stats', {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur chargement statistiques');
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#888888' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(0, 229, 255, 0.2)', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.88rem' }}>Chargement des statistiques en temps réel...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: '#111111', border: '1px solid #331111', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#EF4444', marginBottom: '1rem' }}>⚠️ {error || 'Impossible de charger les données.'}</p>
        <button type="button" onClick={() => fetchStats(true)} className="admin-btn admin-btn--primary">
          Réessayer
        </button>
      </div>
    );
  }

  const { kpis, packs_analysis, pack_rankings, ai_costs, profitability, daily_series } = data;

  // Calcul pour graphiques SVG
  const maxRevenue = Math.max(...daily_series.map((s) => s.revenue), 1000);
  const maxGen = Math.max(...daily_series.map((s) => s.generations), 5);

  return (
    <div>
      {/* En-tête de la page */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Tableau de bord Général</h1>
          <p className="admin-page-subtitle">
            Indicateurs d’activité, performance commerciale, générations IA et rentabilité en temps réel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="admin-btn admin-btn--secondary admin-btn--sm"
          >
            <span>{refreshing ? '⟳ Actualisation...' : '⟳ Rafraîchir'}</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 1 : KPIs CHIFFRE D'AFFAIRES & PAIEMENTS FEDAPAY
          ════════════════════════════════════════════════════════════ */}
      <div className="kpi-grid">
        {/* CA Total */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Chiffre d’affaires total</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value" style={{ color: '#00E5FF' }}>
            {kpis.revenue.total_fcfa.toLocaleString('fr-FR')} <span style={{ fontSize: '1rem', color: '#888' }}>FCFA</span>
          </div>
          <div className="kpi-card__sub">
            Aujourd’hui : <span className="kpi-card__highlight">{kpis.revenue.today_fcfa.toLocaleString('fr-FR')} FCFA</span>
            <span style={{ color: '#444' }}>•</span>
            7j : {kpis.revenue.week_fcfa.toLocaleString('fr-FR')} FCFA
          </div>
        </div>

        {/* Paiements FedaPay */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Paiements FedaPay</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value">
            {kpis.payments.successful}{' '}
            <span style={{ fontSize: '0.85rem', color: '#10B981', fontWeight: 500 }}>réussis</span>
          </div>
          <div className="kpi-card__sub">
            Échoués / Attente : <span style={{ color: '#EF4444' }}>{kpis.payments.failed_or_pending}</span>
            <span style={{ color: '#444' }}>•</span>
            Panier moyen : <span className="kpi-card__highlight">{kpis.payments.average_basket_fcfa.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Utilisateurs */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Utilisateurs</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value">{kpis.users.total}</div>
          <div className="kpi-card__sub">
            Aujourd’hui : <span className="kpi-card__highlight">+{kpis.users.new_today}</span>
            <span style={{ color: '#444' }}>•</span>
            Actifs : <span style={{ color: '#10B981' }}>{kpis.users.active}</span>
            <span style={{ color: '#444' }}>•</span>
            Ce mois : +{kpis.users.new_month}
          </div>
        </div>

        {/* Générations IA Totales */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Générations IA</span>
            <div className="kpi-card__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
          </div>
          <div className="kpi-card__value">{kpis.generations.total}</div>
          <div className="kpi-card__sub">
            Payantes : <span className="kpi-card__highlight">{kpis.generations.paid_count}</span>
            <span style={{ color: '#444' }}>•</span>
            Admin : <span style={{ color: '#888' }}>{kpis.generations.admin_count}</span>
            <span style={{ color: '#444' }}>•</span>
            Aujourd’hui : +{kpis.generations.today}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 2 : GRAPHIQUES SVG (Revenus & Générations / Jour)
          ════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Graphique Chiffre d'affaires */}
        <div className="admin-section" style={{ margin: 0 }}>
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              📈 Chiffre d’affaires par jour (FCFA)
            </h2>
            <span className="admin-section__badge">14 derniers jours</span>
          </div>

          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '1rem 0 0.5rem 0', borderBottom: '1px solid #1F1F1F' }}>
            {daily_series.map((pt) => {
              const heightPct = Math.max(4, Math.round((pt.revenue / maxRevenue) * 100));
              return (
                <div key={pt.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${pt.date}: ${pt.revenue.toLocaleString('fr-FR')} FCFA`}>
                  <div style={{ width: '100%', maxWidth: 28, height: `${heightPct}%`, background: pt.revenue > 0 ? 'linear-gradient(180deg, #00E5FF 0%, rgba(0, 229, 255, 0.25) 100%)' : '#181818', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                  <span style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.35rem', whiteSpace: 'nowrap' }}>{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Graphique Générations par jour */}
        <div className="admin-section" style={{ margin: 0 }}>
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              🎨 Générations par jour (Ideogram 4.0)
            </h2>
            <span className="admin-section__badge">14 derniers jours</span>
          </div>

          <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '1rem 0 0.5rem 0', borderBottom: '1px solid #1F1F1F' }}>
            {daily_series.map((pt) => {
              const heightPct = Math.max(4, Math.round((pt.generations / maxGen) * 100));
              return (
                <div key={pt.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${pt.date}: ${pt.generations} générations`}>
                  <div style={{ width: '100%', maxWidth: 28, height: `${heightPct}%`, background: pt.generations > 0 ? 'linear-gradient(180deg, #10B981 0%, rgba(16, 185, 129, 0.25) 100%)' : '#181818', borderRadius: '4px 4px 0 0', transition: 'height 0.3s ease' }} />
                  <span style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.35rem', whiteSpace: 'nowrap' }}>{pt.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 3 : ANALYSE DÉTAILLÉE DES 4 FORFAITS & CLASSEMENTS
          ════════════════════════════════════════════════════════════ */}
      <div className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">
            📦 Performance des 4 Forfaits Commerciaux
          </h2>
          <span className="admin-section__badge">1 000, 3 000, 5 000, 15 000 FCFA</span>
        </div>

        {/* Podium / Classements */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>🥇 Le plus vendu</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00E5FF' }}>
              {pack_rankings.most_sold?.name || '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#AAA', marginTop: '0.2rem' }}>
              {pack_rankings.most_sold?.sales_count || 0} ventes ({pack_rankings.most_sold?.price_fcfa?.toLocaleString('fr-FR')} FCFA)
            </div>
          </div>

          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>💰 Plus fort chiffre d’affaires</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981' }}>
              {pack_rankings.most_revenue?.name || '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#AAA', marginTop: '0.2rem' }}>
              {pack_rankings.most_revenue?.revenue_fcfa?.toLocaleString('fr-FR')} FCFA générés
            </div>
          </div>

          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.3rem' }}>🪙 Plus distributeur de crédits</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F59E0B' }}>
              {pack_rankings.most_credits?.name || '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#AAA', marginTop: '0.2rem' }}>
              {pack_rankings.most_credits?.credits_distributed?.toLocaleString('fr-FR')} crédits injectés
            </div>
          </div>
        </div>

        {/* Tableau comparatif des 4 forfaits */}
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Forfait</th>
                <th>Prix unitaire</th>
                <th>Nombre de ventes</th>
                <th>Chiffre d’affaires</th>
                <th>Crédits distribués</th>
                <th>Clients uniques</th>
              </tr>
            </thead>
            <tbody>
              {packs_analysis.map((pack) => (
                <tr key={pack.id}>
                  <td style={{ fontWeight: 600, color: '#FFFFFF' }}>{pack.name}</td>
                  <td>{pack.price_fcfa.toLocaleString('fr-FR')} FCFA</td>
                  <td style={{ fontWeight: 700, color: '#00E5FF' }}>{pack.sales_count}</td>
                  <td style={{ fontWeight: 600, color: '#10B981' }}>{pack.revenue_fcfa.toLocaleString('fr-FR')} FCFA</td>
                  <td>{pack.credits_distributed.toLocaleString('fr-FR')} crédits</td>
                  <td>{pack.unique_users} utilisateur(s)</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 4 : COÛTS IA (IDEOGRAM 4.0) & PANNEAU RENTABILITÉ
          ════════════════════════════════════════════════════════════ */}
      <div id="rentabilite" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {/* Suivi des coûts IA */}
        <div className="admin-section" style={{ margin: 0 }}>
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              🤖 Suivi des Coûts IA Ideogram 4.0
            </h2>
            <span className="tag tag--cyan">Estimation</span>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#777', margin: '0 0 1rem 0' }}>
            {ai_costs.estimation_note}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #1E1E1E' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>Coût IA Aujourd’hui</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>
                {ai_costs.cost_today_fcfa.toLocaleString('fr-FR')} FCFA
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>({ai_costs.cost_today_usd} $ US)</div>
            </div>

            <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #1E1E1E' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>Coût IA Cette semaine</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>
                {ai_costs.cost_week_fcfa.toLocaleString('fr-FR')} FCFA
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>({ai_costs.cost_week_usd} $ US)</div>
            </div>

            <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #1E1E1E' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>Coût IA Ce mois-ci</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>
                {ai_costs.cost_month_fcfa.toLocaleString('fr-FR')} FCFA
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>({ai_costs.cost_month_usd} $ US)</div>
            </div>

            <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #1E1E1E' }}>
              <div style={{ fontSize: '0.75rem', color: '#888' }}>Coût IA Total cumulé</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00E5FF' }}>
                {ai_costs.cost_total_fcfa.toLocaleString('fr-FR')} FCFA
              </div>
              <div style={{ fontSize: '0.75rem', color: '#666' }}>({ai_costs.cost_total_usd} $ US)</div>
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#888', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #1B1B1B', paddingTop: '0.75rem' }}>
            <span>Total requêtes IA Ideogram 4.0 :</span>
            <strong style={{ color: '#FFF' }}>{ai_costs.requests_total} requêtes</strong>
          </div>
        </div>

        {/* Panneau Rentabilité */}
        <div className="admin-section" style={{ margin: 0 }}>
          <div className="admin-section__header">
            <h2 className="admin-section__title">
              📊 Rentabilité & Marge Brute
            </h2>
            <span className="tag tag--success">{profitability.marge_estimee_pct}% de marge</span>
          </div>

          <div style={{ background: '#111', padding: '1.25rem', borderRadius: 10, border: '1px solid #222', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ color: '#AAA', fontSize: '0.9rem' }}>Chiffre d’affaires réel (FedaPay) :</span>
              <strong style={{ color: '#10B981', fontSize: '1rem' }}>+{profitability.ca_reel_fcfa.toLocaleString('fr-FR')} FCFA</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <span style={{ color: '#AAA', fontSize: '0.9rem' }}>Coût estimé API Ideogram 4.0 :</span>
              <strong style={{ color: '#EF4444', fontSize: '1rem' }}>-{profitability.cout_ia_estime_fcfa.toLocaleString('fr-FR')} FCFA</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ color: '#AAA', fontSize: '0.9rem' }}>Frais opérateurs FedaPay estimés (~2.5%) :</span>
              <strong style={{ color: '#EF4444', fontSize: '1rem' }}>-{profitability.frais_operateurs_estimes_fcfa.toLocaleString('fr-FR')} FCFA</strong>
            </div>

            <div style={{ borderTop: '1px solid #282828', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>Marge Brute Estimée</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#00E5FF' }}>
                  {profitability.marge_estimee_fcfa.toLocaleString('fr-FR')} FCFA
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tag tag--cyan" style={{ fontSize: '0.9rem', padding: '0.35rem 0.75rem' }}>
                  {profitability.marge_estimee_pct}%
                </span>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: '#777', lineHeight: 1.4 }}>
            ℹ️ <strong>Règle de transparence :</strong> Les chiffres d'affaires et paiements sont des valeurs réelles vérifiées sur FedaPay. Les dépenses IA et marges sont des estimations calculées strictement sur les barèmes configurés.
          </div>
        </div>
      </div>
    </div>
  );
}
