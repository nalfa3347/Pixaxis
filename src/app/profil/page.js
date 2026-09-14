'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { CREDIT_PACKS } from '@/config/constants';
import dynamic from 'next/dynamic';

const AccountModal = dynamic(() => import('@/components/AccountModal'), { ssr: false });
const NotificationDrawer = dynamic(() => import('@/components/NotificationDrawer'), { ssr: false });
import { supabase } from '@/lib/supabase-client';
import { usePixaxis } from '@/context/PixaxisContext';

/**
 * Page 3 — Profil
 * - Solde de crédits avec barre visuelle instantanée
 * - Historique d'utilisation des crédits
 * - Packs de crédits disponibles à l'achat avec info-bulle FEFO
 * - Section Paramètres connectée : Compte, Notifications, Déconnexion
 */
export default function ProfilPage() {
  const { 
    creditsData, 
    fetchCredits: refreshCredits, 
    isAuthenticated, 
    getAuthHeaders,
    signOut,
    user,
    isAdmin,
  } = usePixaxis();

  // Affichage direct depuis le cache de session (chargement perçu instantané 0ms)
  const credits = creditsData ? (creditsData.total_credits ?? 0) : 0;
  const activeLots = creditsData?.active_lots || [];
  const transactions = creditsData?.transactions || [];
  const isLoadingCredits = creditsData === null;

  const [loadingPackId, setLoadingPackId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modales interactives
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [showFefoTooltip, setShowFefoTooltip] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Données administrateur pour consultation directe sur la page Profil
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loadingAdminData, setLoadingAdminData] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let isMounted = true;
    async function loadAdminSummary() {
      setLoadingAdminData(true);
      try {
        const [usersRes, statsRes] = await Promise.all([
          fetch('/api/admin/users?limit=15', { headers: getAuthHeaders() }),
          fetch('/api/admin/stats', { headers: getAuthHeaders() }),
        ]);
        if (usersRes.ok && statsRes.ok) {
          const [usersJson, statsJson] = await Promise.all([usersRes.json(), statsRes.json()]);
          if (isMounted) {
            setAdminUsers(usersJson.users || []);
            setAdminStats(statsJson);
          }
        }
      } catch (e) {
        console.warn('Erreur chargement aperçu admin:', e);
      } finally {
        if (isMounted) setLoadingAdminData(false);
      }
    }
    loadAdminSummary();
  }, [isAdmin, getAuthHeaders]);

  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, 3);
  const hasMoreTransactions = transactions.length > 3;
  const remainingCount = transactions.length - 3;

  // Revalidation silencieuse en tâche de fond (SWR) sans bloquer l'affichage
  useEffect(() => {
    refreshCredits(false);
  }, [refreshCredits]);

  // Vérification automatique après redirection de paiement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get('payment');
      const txId = params.get('id') || params.get('tx_id') || params.get('transaction_id');

      if (paymentStatus === 'return' && txId) {
        // Appeler la vérification serveur-à-serveur
        fetch('/api/checkout/verify', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ transaction_id: txId }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.approved) {
              setSuccessMessage('Paiement confirmé avec succès ! Vos crédits ont été ajoutés à votre compte.');
              refreshCredits(true);
            } else {
              setErrorMessage(res.message || 'Le paiement n’a pas pu être confirmé.');
            }
          })
          .catch((err) => setErrorMessage(err.message));
      }
    }
  }, [refreshCredits, getAuthHeaders]);

  // Vérifie si un pack précis a un lot actif (non expiré et crédits restants > 0)
  const isPackActive = (packId) => {
    return activeLots.some(
      (lot) => lot.pack_id === packId && lot.credits_restants > 0 && new Date(lot.date_expiration) > new Date()
    );
  };

  const maxCredits = 15000; // pour la barre visuelle
  const creditPercentage = maxCredits > 0 ? Math.min((credits / maxCredits) * 100, 100) : 0;

  async function handleBuyPack(pack) {
    if (!isAuthenticated) {
      window.location.href = '/connexion?redirect=/profil';
      return;
    }
    if (isPackActive(pack.id)) {
      setErrorMessage(`Vous avez encore des crédits actifs sur le pack ${pack.name}.`);
      return;
    }
    setLoadingPackId(pack.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/checkout/fedapay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ pack_id: pack.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’initialisation du paiement');
      }
      if (data.payment_url) {
        window.location.href = data.payment_url;
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoadingPackId(null);
    }
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setSuccessMessage('Déconnexion effectuée avec succès. Vous naviguez en session anonyme.');
    } catch (err) {
      setErrorMessage(err.message || 'Erreur lors de la déconnexion');
    }
  }

  return (
    <div>
      {/* ─── Espace Administrateur : Utilisateurs & Crédits Achetés ─── */}
      {isAdmin && (
        <section className="profil-admin-section">
          <div className="profil-admin-header">
            <div className="profil-admin-title-area">
              <div className="profil-admin-badge">
                <span className="profil-admin-badge__dot" />
                <span className="profil-admin-badge__text">
                  Espace Administrateur
                </span>
              </div>
              <h2 className="profil-admin-title">
                👥 Utilisateurs de l’application & Crédits
              </h2>
              <p className="profil-admin-desc">
                Suivi en temps réel des utilisateurs, des crédits disponibles et des volumes achetés.
              </p>
            </div>
            <div className="profil-admin-actions">
              <Link
                href="/admin/users"
                className="profil-admin-btn profil-admin-btn--secondary"
              >
                Annuaire complet →
              </Link>
              <Link
                href="/admin"
                className="profil-admin-btn profil-admin-btn--primary"
              >
                Console Admin →
              </Link>
            </div>
          </div>

          {/* Cartes d'indicateurs clés */}
          {adminStats && (
            <div className="profil-admin-kpis">
              <div className="profil-admin-kpi-card">
                <div className="profil-admin-kpi-label">Inscrits</div>
                <div className="profil-admin-kpi-value">
                  {adminStats.kpis?.users?.total || 0}
                </div>
                <div className="profil-admin-kpi-sub profil-admin-kpi-sub--success">
                  {adminStats.kpis?.users?.active || 0} actifs
                </div>
              </div>

              <div className="profil-admin-kpi-card profil-admin-kpi-card--accent">
                <div className="profil-admin-kpi-label profil-admin-kpi-label--accent">Crédits Achetés</div>
                <div className="profil-admin-kpi-value profil-admin-kpi-value--accent">
                  {(adminStats.kpis?.credits?.total_purchased || 0).toLocaleString('fr-FR')}
                </div>
                <div className="profil-admin-kpi-sub profil-admin-kpi-sub--success">
                  {(adminStats.kpis?.revenue?.total_fcfa || 0).toLocaleString('fr-FR')} FCFA
                </div>
              </div>

              <div className="profil-admin-kpi-card">
                <div className="profil-admin-kpi-label">En Circulation</div>
                <div className="profil-admin-kpi-value profil-admin-kpi-value--success">
                  {(adminStats.kpis?.credits?.total_remaining || 0).toLocaleString('fr-FR')}
                </div>
                <div className="profil-admin-kpi-sub">
                  Restants
                </div>
              </div>

              <div className="profil-admin-kpi-card">
                <div className="profil-admin-kpi-label">Consommés</div>
                <div className="profil-admin-kpi-value profil-admin-kpi-value--danger">
                  {(adminStats.kpis?.credits?.total_consumed || 0).toLocaleString('fr-FR')}
                </div>
                <div className="profil-admin-kpi-sub">
                  Par clients
                </div>
              </div>
            </div>
          )}

          {/* Tableau Desktop (visible sur ordinateur et tablette >= 769px) */}
          <div className="profil-admin-table-wrapper">
            <table className="profil-admin-table">
              <thead>
                <tr>
                  <th>Utilisateur</th>
                  <th>Entreprise</th>
                  <th style={{ color: '#00E5FF' }}>Crédits Restants</th>
                  <th style={{ color: '#FFF' }}>Crédits Achetés</th>
                  <th>Crédits Consommés</th>
                  <th>Total Payé</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loadingAdminData ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      Chargement des utilisateurs en temps réel...
                    </td>
                  </tr>
                ) : adminUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                      Aucun utilisateur inscrit pour le moment.
                    </td>
                  </tr>
                ) : (
                  adminUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#FFF' }}>{u.nom}</div>
                        <div style={{ fontSize: '0.75rem', color: '#777' }}>{u.email}</div>
                        {u.telephone && <div style={{ fontSize: '0.7rem', color: '#00E5FF' }}>📞 {u.telephone}</div>}
                      </td>
                      <td style={{ color: '#AAA' }}>{u.nom_business || '—'}</td>
                      <td>
                        <span style={{
                          fontWeight: 700,
                          color: u.credits_actuels > 0 ? '#00E5FF' : '#666',
                          background: u.credits_actuels > 0 ? 'rgba(0, 229, 255, 0.1)' : 'transparent',
                          padding: u.credits_actuels > 0 ? '0.2rem 0.5rem' : '0',
                          borderRadius: 4,
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
                      <td style={{ fontWeight: 600, color: u.montant_total_paye > 0 ? '#10B981' : '#666' }}>
                        {u.montant_total_paye.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td>
                        <span className={`tag ${u.statut === 'actif' ? 'tag--success' : 'tag--neutral'}`}>
                          {u.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Cartes Mobiles Fluides (visible sur smartphones <= 768px) */}
          <div className="profil-admin-user-cards">
            {loadingAdminData ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', background: '#0D0D0D', borderRadius: 8 }}>
                Chargement des utilisateurs en temps réel...
              </div>
            ) : adminUsers.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#888', background: '#0D0D0D', borderRadius: 8 }}>
                Aucun utilisateur inscrit pour le moment.
              </div>
            ) : (
              adminUsers.map((u) => (
                <div key={u.id} className="profil-admin-user-card">
                  <div className="profil-admin-user-card__header">
                    <div>
                      <div className="profil-admin-user-card__name">{u.nom}</div>
                      <div className="profil-admin-user-card__contact">
                        <span>{u.email}</span>
                        {u.telephone && <span className="profil-admin-user-card__phone">📞 {u.telephone}</span>}
                      </div>
                    </div>
                    <span className={`tag ${u.statut === 'actif' ? 'tag--success' : 'tag--neutral'}`} style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      {u.statut}
                    </span>
                  </div>

                  {u.nom_business && (
                    <div className="profil-admin-user-card__biz">
                      🏢 {u.nom_business}
                    </div>
                  )}

                  <div className="profil-admin-user-card__grid">
                    <div>
                      <div className="profil-admin-user-card__metric-label">Solde dispo</div>
                      <div className="profil-admin-user-card__metric-val" style={{ color: u.credits_actuels > 0 ? '#00E5FF' : '#777' }}>
                        {u.credits_actuels} cr.
                      </div>
                    </div>
                    <div>
                      <div className="profil-admin-user-card__metric-label">Achetés</div>
                      <div className="profil-admin-user-card__metric-val" style={{ color: '#FFFFFF' }}>
                        {u.credits_achetes.toLocaleString('fr-FR')} cr.
                      </div>
                    </div>
                    <div>
                      <div className="profil-admin-user-card__metric-label">Consommés</div>
                      <div className="profil-admin-user-card__metric-val" style={{ color: '#EF4444' }}>
                        {u.credits_consommes.toLocaleString('fr-FR')} cr.
                      </div>
                    </div>
                    <div>
                      <div className="profil-admin-user-card__metric-label">Total Payé</div>
                      <div className="profil-admin-user-card__metric-val" style={{ color: u.montant_total_paye > 0 ? '#10B981' : '#777' }}>
                        {u.montant_total_paye.toLocaleString('fr-FR')} F
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* ─── Solde de crédits ─── */}
      <section className="mb-xl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: 'var(--space-sm)' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Mon solde</h2>
          {isAdmin && (
            <span style={{ fontSize: '0.74rem', padding: '2px 10px', background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF', borderRadius: 'var(--radius-full)', fontWeight: 700, border: '1px solid rgba(0, 229, 255, 0.4)' }}>
              🛡️ Admin Illimité
            </span>
          )}
        </div>

        {/* Bannière explicative d'exemption pour le compte administrateur */}
        {isAdmin && (
          <div className="profil-admin-privilege-banner">
            <div className="profil-admin-privilege-banner__content">
              <span style={{ fontSize: '1.4rem' }}>⚡</span>
              <div>
                <div className="profil-admin-privilege-banner__title">
                  Privilèges Administrateur Débloqués
                </div>
                <div className="profil-admin-privilege-banner__desc">
                  Votre compte bénéficie de l'exemption administrateur : générations illimitées au studio, tests de produits et remix sans débit commercial.
                </div>
              </div>
            </div>
            <Link
              href="/creer"
              className="profil-admin-btn profil-admin-btn--primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
            >
              Créer au Studio →
            </Link>
          </div>
        )}

        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
          <div style={{ 
            fontFamily: 'var(--font-heading)', 
            fontSize: 'var(--text-4xl)', 
            fontWeight: 'var(--weight-bold)', 
            color: 'var(--color-accent)',
            marginBottom: 'var(--space-sm)'
          }}>
            {credits}
          </div>
          <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-lg)' }}>
            crédits disponibles
          </div>
          {/* Barre de progression */}
          <div style={{
            width: '100%',
            height: 6,
            backgroundColor: 'var(--color-surface-hover)',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${creditPercentage}%`,
              height: '100%',
              backgroundColor: 'var(--color-accent)',
              borderRadius: 3,
              transition: 'width var(--transition-base)',
            }} />
          </div>

          {/* Détail des lots actifs (FEFO) */}
          {activeLots.length > 0 && (
            <div style={{ marginTop: 'var(--space-lg)', textAlign: 'left', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-md)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Lots actifs en cours (Priorité FEFO)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {activeLots.map((lot, idx) => (
                  <div key={lot.id || idx} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-sm) var(--space-md)',
                    background: idx === 0 ? 'rgba(0, 229, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                    border: idx === 0 ? '1px solid rgba(0, 229, 255, 0.2)' : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                  }}>
                    <div>
                      <span style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
                        Pack {lot.pack_name}
                      </span>
                      {idx === 0 && (
                        <span style={{ fontSize: '10px', marginLeft: 8, color: 'var(--color-accent)', background: 'rgba(0, 229, 255, 0.1)', padding: '1px 6px', borderRadius: 'var(--radius-full)' }}>
                          Prochain consommé
                        </span>
                      )}
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        Expire le {new Date(lot.date_expiration).toLocaleDateString('fr-FR')} • {lot.cout_par_generation} crédits/gén
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-accent)' }}>
                        {lot.credits_restants}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginLeft: 4 }}>
                        crédits ({lot.images_restantes} images)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── Packs de crédits ─── */}
      <section className="mb-xl">
        <h2 className="section-title">Acheter des crédits</h2>
        <p className="section-subtitle" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: showFefoTooltip ? 'var(--space-sm)' : 'var(--space-lg)' }}>
          <span>Tarifs transparents en FCFA — consommation au plus avantageux</span>
          <button
            type="button"
            className="fefo-info-trigger"
            onClick={() => setShowFefoTooltip(!showFefoTooltip)}
            aria-label="En savoir plus sur la consommation des crédits"
            title="Consommation des crédits"
            id="btn-fefo-info"
          >
            !
          </button>
        </p>

        {showFefoTooltip && (
          <div className="fefo-info-banner" role="region" aria-label="Protection automatique de vos crédits">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="fefo-info-trigger" style={{ margin: 0, width: 20, height: 20, fontSize: 12, pointerEvents: 'none' }}>!</span>
                <strong style={{ color: 'var(--color-accent)', fontSize: 'var(--text-sm)' }}>
                  Protection automatique de vos crédits (Règle FEFO)
                </strong>
              </div>
              <button
                type="button"
                onClick={() => setShowFefoTooltip(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontSize: 18,
                  lineHeight: 1,
                  padding: '0 6px',
                }}
                aria-label="Fermer cette explication"
                title="Fermer"
              >
                ✕
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', lineHeight: 1.55 }}>
              Vos crédits les plus proches de leur date limite (3 mois) sont <strong>toujours utilisés en premier</strong>. Vos nouveaux achats ne sont entamés qu'une fois les anciens épuisés, pour ne jamais perdre un crédit.
            </p>
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: 'var(--space-md)',
            background: 'rgba(0, 229, 255, 0.12)',
            border: '1px solid var(--color-accent)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-accent)',
            marginBottom: 'var(--space-md)',
            fontSize: 'var(--text-sm)',
          }}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            padding: 'var(--space-md)',
            background: 'rgba(255, 68, 68, 0.15)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            marginBottom: 'var(--space-md)',
            fontSize: 'var(--text-sm)',
          }}>
            {errorMessage}
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', 
          gap: 'var(--space-md)' 
        }}>
          {CREDIT_PACKS.map((pack) => {
            const active = isPackActive(pack.id);
            const isLoading = loadingPackId === pack.id;

            return (
              <div 
                key={pack.id} 
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 'var(--space-lg)',
                  border: active ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                  background: active ? 'rgba(0, 229, 255, 0.03)' : 'var(--color-surface)',
                  position: 'relative',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)' }}>
                      {pack.name}
                    </span>
                    {active && (
                      <span style={{ 
                        fontSize: '10px', 
                        padding: '2px 8px', 
                        borderRadius: 'var(--radius-full)', 
                        background: 'var(--color-accent)', 
                        color: '#000', 
                        fontWeight: 'var(--weight-bold)' 
                      }}>
                        ACTIF
                      </span>
                    )}
                  </div>

                  <div style={{ 
                    fontFamily: 'var(--font-heading)', 
                    fontSize: 'var(--text-3xl)', 
                    fontWeight: 'var(--weight-bold)', 
                    color: 'var(--color-accent)',
                    margin: 'var(--space-sm) 0'
                  }}>
                    {pack.images_count}
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 'normal', marginLeft: 6 }}>
                      images
                    </span>
                  </div>

                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-xs)' }}>
                    {pack.credits_credited.toLocaleString('fr-FR')} crédits ({pack.cost_per_generation} crédits / image)
                  </div>

                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-md)' }}>
                    Validité : {pack.validity_label}
                  </div>
                </div>

                <div>
                  <div style={{ 
                    fontFamily: 'var(--font-heading)', 
                    fontSize: 'var(--text-xl)', 
                    fontWeight: 'var(--weight-semibold)',
                    marginBottom: 'var(--space-md)',
                    color: 'var(--color-text-primary)'
                  }}>
                    {pack.price_fcfa.toLocaleString('fr-FR')} FCFA
                  </div>

                  {active ? (
                    <div>
                      <div style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-accent)',
                        background: 'rgba(0, 229, 255, 0.1)',
                        padding: 'var(--space-sm)',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        marginBottom: 'var(--space-xs)',
                      }}>
                        Vous avez encore des crédits actifs sur ce pack
                      </div>
                      <button
                        type="button"
                        className="btn btn--secondary btn--full"
                        onClick={() => setErrorMessage(`Le pack ${pack.name} est déjà actif sur votre compte. Consommez d'abord vos crédits restants ou choisissez un autre pack.`)}
                        style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-xs) var(--space-sm)', opacity: 0.8 }}
                        id={`btn-pack-active-${pack.id}`}
                      >
                        Pack déjà actif (Protégé)
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--primary btn--full"
                      onClick={() => handleBuyPack(pack)}
                      disabled={isLoading}
                      style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-sm) var(--space-md)' }}
                      id={`btn-buy-${pack.id}`}
                    >
                      {isLoading ? 'Redirection FedaPay...' : 'Ajouter ce pack'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Historique d'utilisation (3 derniers par défaut + Voir plus) ─── */}
      <section className="mb-xl">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--space-sm)' }}>
          <h2 className="section-title" style={{ margin: 0 }}>Historique</h2>
          {transactions.length > 0 && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
              {showAllTransactions 
                ? `${transactions.length} action${transactions.length > 1 ? 's' : ''}` 
                : `3 dernières actions sur ${transactions.length}`}
            </span>
          )}
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">📊</div>
            <h3 className="empty-state__title">Aucune transaction</h3>
            <p className="empty-state__desc">
              Votre historique d'achat et d'utilisation de crédits apparaîtra ici.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {visibleTransactions.map((tx, idx) => (
                <div 
                  key={tx.id || idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: (idx < visibleTransactions.length - 1 || (hasMoreTransactions && !showAllTransactions)) 
                      ? '1px solid var(--color-border)' 
                      : 'none',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>
                      {tx.type === 'achat_pack' 
                        ? `Achat Pack ${tx.pack_id ? tx.pack_id.toUpperCase() : ''}`
                        : 'Génération d’image IA'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      {new Date(tx.date_transaction).toLocaleString('fr-FR')}
                      {tx.montant_fcfa && ` • ${tx.montant_fcfa.toLocaleString('fr-FR')} FCFA`}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 'var(--weight-bold)',
                    fontSize: 'var(--text-base)',
                    color: tx.type === 'achat_pack' ? 'var(--color-success)' : 'var(--color-error)',
                  }}>
                    {tx.type === 'achat_pack' ? `+${tx.credits_ajoutes}` : `-${tx.credits_debites}`} crédits
                  </div>
                </div>
              ))}

              {hasMoreTransactions && (
                <div style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderTop: showAllTransactions ? '1px solid var(--color-border)' : 'none',
                }}>
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => setShowAllTransactions(!showAllTransactions)}
                    style={{
                      fontSize: 'var(--text-xs)',
                      padding: '6px 18px',
                      color: 'var(--color-accent)',
                      borderColor: 'rgba(0, 229, 255, 0.35)',
                      fontWeight: 'var(--weight-medium)',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-full)',
                    }}
                    id="btn-toggle-transactions"
                  >
                    {showAllTransactions ? (
                      <span>▲ Afficher uniquement les 3 dernières</span>
                    ) : (
                      <span>▼ Voir plus ({remainingCount} autre{remainingCount > 1 ? 's' : ''})</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ─── Paramètres ─── */}
      <section className="mb-xl">
        <h2 className="section-title">Paramètres</h2>
        <div className="card" style={{ padding: 0 }}>
          <div className="settings-list">
            <button 
              type="button"
              className="settings-item" 
              onClick={() => setShowAccountModal(true)}
              style={{ padding: 'var(--space-md) var(--space-lg)' }}
              id="btn-settings-account"
            >
              <span className="settings-item__label">Compte</span>
              <span className="settings-item__value">→</span>
            </button>
            <button 
              type="button"
              className="settings-item" 
              style={{ padding: 'var(--space-md) var(--space-lg)' }}
              id="btn-settings-language"
            >
              <span className="settings-item__label">Langue</span>
              <span className="settings-item__value">Français (Afrique de l'Ouest)</span>
            </button>
            <button 
              type="button"
              className="settings-item" 
              onClick={() => setShowNotificationDrawer(true)}
              style={{ padding: 'var(--space-md) var(--space-lg)' }}
              id="btn-settings-notifications"
            >
              <span className="settings-item__label">Notifications</span>
              <span className="settings-item__value">→</span>
            </button>
            <button 
              type="button"
              className="settings-item" 
              onClick={handleSignOut}
              style={{ padding: 'var(--space-md) var(--space-lg)', borderBottom: 'none' }}
              id="btn-settings-logout"
            >
              <span className="settings-item__label" style={{ color: 'var(--color-error)' }}>Déconnexion</span>
              <span className="settings-item__value" />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Modales interactives ─── */}
      {showAccountModal && (
        <AccountModal
          credits={credits}
          userEmail={user?.email}
          userId={user?.id}
          isAdmin={isAdmin}
          onClose={() => setShowAccountModal(false)}
        />
      )}

      {showNotificationDrawer && (
        <NotificationDrawer
          onClose={() => setShowNotificationDrawer(false)}
        />
      )}
    </div>
  );
}
