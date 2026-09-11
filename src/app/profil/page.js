'use client';

import { useState, useEffect } from 'react';
import { CREDIT_PACKS } from '@/config/constants';
import AccountModal from '@/components/AccountModal';
import NotificationDrawer from '@/components/NotificationDrawer';
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
    user 
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
      {/* ─── Solde de crédits ─── */}
      <section className="mb-xl">
        <h2 className="section-title">Mon solde</h2>
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
