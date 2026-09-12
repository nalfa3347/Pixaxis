'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminUsersPage() {
  const { getAuthHeaders } = usePixaxis();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierData, setDossierData] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filter !== 'all') params.set('filter', filter);

      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, filter, getAuthHeaders]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Chargement de la fiche détaillée
  const handleOpenDossier = async (user) => {
    setSelectedUser(user);
    setLoadingDossier(true);
    setDossierData(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setDossierData(data);
      }
    } catch (err) {
      console.error('Erreur chargement fiche:', err);
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleCloseDossier = () => {
    setSelectedUser(null);
    setDossierData(null);
  };

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Gestion des Utilisateurs</h1>
          <p className="admin-page-subtitle">
            Consultez les comptes enregistrés, leurs forfaits, soldes de crédits et historiques de génération.
          </p>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="admin-filter-bar">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, email, téléphone ou entreprise..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search-input"
        />

        <div className="admin-filter-pills">
          {[
            { id: 'all', label: 'Tous' },
            { id: 'actifs', label: 'Actifs' },
            { id: 'inactifs', label: 'Inactifs' },
            { id: 'avec_credits', label: 'Avec crédits' },
            { id: 'sans_credits', label: 'Sans crédits' },
            { id: 'nouveaux', label: 'Nouveaux (< 7j)' },
            { id: 'gros_utilisateurs', label: 'Gros clients' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilter(pill.id)}
              className={`admin-filter-pill ${filter === pill.id ? 'admin-filter-pill--active' : ''}`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Entreprise</th>
              <th>Date d’inscription</th>
              <th>Dernier accès</th>
              <th>Crédits restants</th>
              <th>Générations</th>
              <th>Total payé</th>
              <th>Dernier forfait</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Chargement de l’annuaire...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Aucun utilisateur ne correspond à vos critères de recherche.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenDossier(u)}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>{u.nom}</div>
                    <div style={{ fontSize: '0.78rem', color: '#777' }}>{u.email}</div>
                    {u.telephone && (
                      <div style={{ fontSize: '0.72rem', color: '#00E5FF' }}>📞 {u.telephone}</div>
                    )}
                  </td>
                  <td>{u.nom_business || <span style={{ color: '#555' }}>—</span>}</td>
                  <td style={{ fontSize: '0.8rem', color: '#AAA' }}>
                    {new Date(u.date_creation).toLocaleDateString('fr-FR')}
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#AAA' }}>
                    {new Date(u.dernier_acces).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: u.credits_actuels > 0 ? '#00E5FF' : '#666' }}>
                      {u.credits_actuels}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}> / {u.credits_achetes}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: '#FFF' }}>{u.nombre_generations}</span>
                    {u.generations_admin_count > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#F59E0B', marginLeft: '0.3rem' }} title="Générations administrateur gratuites">
                        ({u.generations_admin_count} admin)
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600, color: u.montant_total_paye > 0 ? '#10B981' : '#666' }}>
                    {u.montant_total_paye.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td>
                    {u.dernier_forfait ? (
                      <span className="tag tag--cyan">{u.dernier_forfait}</span>
                    ) : (
                      <span style={{ color: '#555' }}>Aucun</span>
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
                      Détails →
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════
          FICHE DÉTAILLÉE DE L'UTILISATEUR (DRAWER LATÉRAL)
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
