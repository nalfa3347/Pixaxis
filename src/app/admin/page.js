'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminDashboardPage() {
  const { getAuthHeaders } = usePixaxis();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fiche détaillée d'un utilisateur au clic
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierData, setDossierData] = useState(null);

  const fetchDashboardData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: getAuthHeaders() }),
        fetch('/api/admin/users?limit=50', { headers: getAuthHeaders() }),
      ]);

      const [statsJson, usersJson] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
      ]);

      if (!statsRes.ok) throw new Error(statsJson.error || 'Erreur chargement statistiques');
      setData(statsJson);
      if (usersRes.ok) {
        setUsers(usersJson.users || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Ouverture du dossier détaillé d'un utilisateur
  const handleOpenDossier = async (u) => {
    setSelectedUser(u);
    setLoadingDossier(true);
    setDossierData(null);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (res.ok) setDossierData(json);
    } catch (err) {
      console.error('Erreur chargement dossier:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleCloseDossier = () => {
    setSelectedUser(null);
    setDossierData(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: '#888888' }}>
        <div style={{ width: 36, height: 36, border: '3px solid rgba(0, 229, 255, 0.2)', borderTopColor: '#00E5FF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ fontSize: '0.88rem' }}>Chargement des statistiques et utilisateurs en temps réel...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ background: '#111111', border: '1px solid #331111', borderRadius: 12, padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: '#EF4444', marginBottom: '1rem' }}>⚠️ {error || 'Impossible de charger les données.'}</p>
        <button type="button" onClick={() => fetchDashboardData(true)} className="admin-btn admin-btn--primary">
          Réessayer
        </button>
      </div>
    );
  }

  const { kpis, packs_analysis, pack_rankings, ai_costs, profitability, daily_series } = data;

  // Filtrage local des utilisateurs pour la recherche rapide
  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      (u.nom && u.nom.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.telephone && u.telephone.toLowerCase().includes(q)) ||
      (u.nom_business && u.nom_business.toLowerCase().includes(q))
    );
  });

  const maxRevenue = Math.max(...daily_series.map((s) => s.revenue), 1000);
  const maxGen = Math.max(...daily_series.map((s) => s.generations), 5);

  return (
    <div>
      {/* En-tête de la page */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Tableau de bord Général</h1>
          <p className="admin-page-subtitle">
            Indicateurs d’activité, utilisateurs de l’application, crédits achetés et consommés en temps réel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="admin-btn admin-btn--secondary admin-btn--sm"
          >
            <span>{refreshing ? '⟳ Actualisation...' : '⟳ Rafraîchir'}</span>
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 1 : CARTE PRINCIPALE DES CRÉDITS ET ACHATS
          ════════════════════════════════════════════════════════════ */}
      <div className="kpi-grid">
        {/* Crédits Achetés */}
        <div className="kpi-card" style={{ borderColor: 'rgba(0, 229, 255, 0.35)' }}>
          <div className="kpi-card__top">
            <span className="kpi-card__label" style={{ color: '#00E5FF' }}>Total Crédits Achetés</span>
            <div className="kpi-card__icon" style={{ background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF' }}>
              🪙
            </div>
          </div>
          <div className="kpi-card__value" style={{ color: '#00E5FF' }}>
            {kpis.credits.total_purchased.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">
            Chiffre d’affaires : <strong style={{ color: '#10B981' }}>{kpis.revenue.total_fcfa.toLocaleString('fr-FR')} FCFA</strong>
          </div>
        </div>

        {/* Crédits Restants (En circulation) */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Crédits Restants (Disponibles)</span>
            <div className="kpi-card__icon">✓</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#10B981' }}>
            {kpis.credits.total_remaining.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">
            Actuellement utilisables par vos clients
          </div>
        </div>

        {/* Crédits Consommés */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Crédits Consommés</span>
            <div className="kpi-card__icon">⚡</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#EF4444' }}>
            {kpis.credits.total_consumed.toLocaleString('fr-FR')}
          </div>
          <div className="kpi-card__sub">
            Générations confirmées : <span className="kpi-card__highlight">{kpis.generations.paid_count} payantes</span>
          </div>
        </div>

        {/* Utilisateurs Inscrits */}
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Utilisateurs de l’application</span>
            <div className="kpi-card__icon">👥</div>
          </div>
          <div className="kpi-card__value">{kpis.users.total}</div>
          <div className="kpi-card__sub">
            Actifs : <span style={{ color: '#10B981', fontWeight: 600 }}>{kpis.users.active}</span>
            <span style={{ color: '#444' }}>•</span>
            Aujourd’hui : +{kpis.users.new_today}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 2 : TABLEAU DIRECT DES UTILISATEURS ET LEURS CRÉDITS
          ════════════════════════════════════════════════════════════ */}
      <div className="admin-section" style={{ border: '1px solid rgba(0, 229, 255, 0.25)', boxShadow: '0 0 20px rgba(0, 229, 255, 0.05)' }}>
        <div className="admin-section__header">
          <div>
            <h2 className="admin-section__title" style={{ color: '#FFFFFF', fontSize: '1.25rem' }}>
              👥 Utilisateurs de l’application & Soldes de Crédits ({users.length})
            </h2>
            <p style={{ margin: '0.25rem 0 0 0', color: '#888', fontSize: '0.85rem' }}>
              Consultez chaque utilisateur, son solde de crédits actuel, ses crédits achetés et son montant total payé.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/admin/users" className="admin-btn admin-btn--secondary admin-btn--sm">
              Annuaire complet & filtres avancés →
            </Link>
          </div>
        </div>

        {/* Recherche rapide */}
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="🔍 Filtrer rapidement un utilisateur par nom, email ou téléphone..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="admin-search-input"
            style={{ width: '100%', maxWidth: '450px' }}
          />
        </div>

        {/* Tableau intégré des utilisateurs */}
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Entreprise</th>
                <th>Crédits Actuels (Restants)</th>
                <th>Crédits Achetés</th>
                <th>Crédits Consommés</th>
                <th>Total Payé</th>
                <th>Générations</th>
                <th>Statut</th>
                <th>Dossier</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDossier(u)}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#FFF' }}>{u.nom}</div>
                      <div style={{ fontSize: '0.78rem', color: '#777' }}>{u.email}</div>
                      {u.telephone && (
                        <div style={{ fontSize: '0.72rem', color: '#00E5FF' }}>📞 {u.telephone}</div>
                      )}
                    </td>
                    <td>{u.nom_business || <span style={{ color: '#555' }}>—</span>}</td>
                    <td>
                      <span style={{ 
                        fontWeight: 700, 
                        fontSize: '0.95rem',
                        color: u.credits_actuels > 0 ? '#00E5FF' : '#666',
                        background: u.credits_actuels > 0 ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                        padding: u.credits_actuels > 0 ? '0.2rem 0.55rem' : '0',
                        borderRadius: 4,
                        border: u.credits_actuels > 0 ? '1px solid rgba(0, 229, 255, 0.3)' : 'none'
                      }}>
                        {u.credits_actuels} crédits
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                      {u.credits_achetes.toLocaleString('fr-FR')}
                    </td>
                    <td style={{ color: '#EF4444', fontWeight: 500 }}>
                      {u.credits_consommes.toLocaleString('fr-FR')}
                    </td>
                    <td style={{ fontWeight: 700, color: u.montant_total_paye > 0 ? '#10B981' : '#666' }}>
                      {u.montant_total_paye.toLocaleString('fr-FR')} FCFA
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#FFF' }}>{u.nombre_generations}</span>
                      {u.generations_admin_count > 0 && (
                        <span style={{ fontSize: '0.7rem', color: '#F59E0B', marginLeft: '0.3rem' }} title="Générations administrateur">
                          ({u.generations_admin_count} admin)
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`tag ${u.statut === 'actif' ? 'tag--success' : 'tag--neutral'}`}>
                        {u.statut}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDossier(u);
                        }}
                        className="admin-btn admin-btn--secondary admin-btn--sm"
                      >
                        Voir fiche →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          BLOC 3 : ANALYSE DES 4 FORFAITS & REVENUS
          ════════════════════════════════════════════════════════════ */}
      <div className="admin-section">
        <div className="admin-section__header">
          <h2 className="admin-section__title">
            📦 Ventes par Forfait (1 000, 3 000, 5 000, 15 000 FCFA)
          </h2>
          <span className="admin-section__badge">Packs commerciaux</span>
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
          BLOC 4 : GRAPHIQUES SVG (Revenus & Générations / Jour)
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
          BLOC 5 : COÛTS IA (IDEOGRAM 4.0) & PANNEAU RENTABILITÉ
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

      {/* ════════════════════════════════════════════════════════════
          FICHE DÉTAILLÉE DE L'UTILISATEUR AU CLIC (MODALE / TIROIR)
          ════════════════════════════════════════════════════════════ */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={handleCloseDossier}>
          <div className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer__header">
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#FFF' }}>
                  Fiche Utilisateur
                </h2>
                <span style={{ fontSize: '0.8rem', color: '#00E5FF' }}>ID : {selectedUser.id}</span>
              </div>
              <button
                type="button"
                onClick={handleCloseDossier}
                style={{ background: 'none', border: 'none', color: '#AAA', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div className="admin-drawer__body">
              {loadingDossier ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
                  Chargement du dossier complet...
                </div>
              ) : !dossierData ? (
                <div style={{ color: '#EF4444' }}>Impossible de charger la fiche.</div>
              ) : (
                <>
                  {/* Résumé profil */}
                  <div style={{ background: '#121212', border: '1px solid #222', borderRadius: 10, padding: '1.25rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      {dossierData.profile.logo_url ? (
                        <img
                          src={dossierData.profile.logo_url}
                          alt="Logo de marque"
                          style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'contain', background: '#000', border: '1px solid #333' }}
                        />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: 8, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '1.2rem' }}>
                          👤
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#FFF' }}>
                          {dossierData.profile.nom}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#AAA' }}>
                          {dossierData.profile.email}
                        </div>
                        {dossierData.profile.telephone && (
                          <div style={{ fontSize: '0.82rem', color: '#00E5FF' }}>
                            📞 {dossierData.profile.telephone}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', color: '#AAA', borderTop: '1px solid #222', paddingTop: '0.75rem' }}>
                      <div>Business : <strong style={{ color: '#FFF' }}>{dossierData.profile.nom_business || 'Non renseigné'}</strong></div>
                      <div>Format préféré : <strong style={{ color: '#FFF' }}>{dossierData.profile.format_prefere}</strong></div>
                      <div>Inscrit le : <strong style={{ color: '#FFF' }}>{new Date(dossierData.profile.date_creation).toLocaleDateString('fr-FR')}</strong></div>
                      <div>Onboarding : <strong style={{ color: dossierData.profile.has_completed_onboarding ? '#10B981' : '#F59E0B' }}>{dossierData.profile.has_completed_onboarding ? 'Terminé' : 'En attente'}</strong></div>
                    </div>
                  </div>

                  {/* Totaux */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #222' }}>
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>Total Payé</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#10B981' }}>
                        {dossierData.summary.total_paye_fcfa.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                    <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #222' }}>
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>Crédits Restants</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00E5FF' }}>
                        {dossierData.summary.credits_restants}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#666' }}>({dossierData.summary.credits_consommes} consommés)</div>
                    </div>
                    <div style={{ background: '#111', padding: '0.85rem', borderRadius: 8, border: '1px solid #222' }}>
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>Générations IA</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFF' }}>
                        {dossierData.summary.nombre_generations}
                      </div>
                    </div>
                  </div>

                  {/* Historique des paiements */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFF', marginBottom: '0.6rem' }}>
                      💳 Historique des Achats & Forfaits ({dossierData.transactions.length})
                    </h3>
                    {dossierData.transactions.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: '#666' }}>Aucune transaction enregistrée.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {dossierData.transactions.map((tx) => (
                          <div key={tx.id} style={{ background: '#121212', padding: '0.65rem 0.85rem', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                            <div>
                              <strong style={{ color: '#FFF' }}>{tx.type}</strong>
                              {tx.pack_id && <span style={{ color: '#00E5FF', marginLeft: '0.4rem' }}>({tx.pack_id})</span>}
                              <div style={{ fontSize: '0.72rem', color: '#666' }}>{new Date(tx.date_transaction).toLocaleString('fr-FR')}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {tx.montant_fcfa && <div style={{ color: '#10B981', fontWeight: 600 }}>{tx.montant_fcfa.toLocaleString('fr-FR')} FCFA</div>}
                              {tx.credits_debites && <div style={{ color: '#EF4444' }}>-{tx.credits_debites} crédits</div>}
                              {tx.credits_ajoutes && <div style={{ color: '#00E5FF' }}>+{tx.credits_ajoutes} crédits</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Images Générées */}
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FFF', marginBottom: '0.6rem' }}>
                      🎨 Images Générées ({dossierData.generations.length})
                    </h3>
                    {dossierData.generations.length === 0 ? (
                      <div style={{ fontSize: '0.82rem', color: '#666' }}>Aucune image générée.</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                        {dossierData.generations.map((gen) => (
                          <div key={gen.id} style={{ background: '#121212', border: '1px solid #222', borderRadius: 8, overflow: 'hidden' }}>
                            <img
                              src={gen.url}
                              alt={gen.prompt || 'Image générée'}
                              style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{ padding: '0.5rem', fontSize: '0.75rem' }}>
                              <div style={{ color: '#00E5FF', fontWeight: 600 }}>{gen.type_creation}</div>
                              <div style={{ color: '#777', fontSize: '0.68rem' }}>{new Date(gen.date_creation).toLocaleDateString('fr-FR')}</div>
                              {gen.is_admin && <span className="tag tag--warning" style={{ fontSize: '0.62rem', marginTop: '0.2rem' }}>Admin</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
