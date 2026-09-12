'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminGenerationsPage() {
  const { getAuthHeaders } = usePixaxis();
  const [generations, setGenerations] = useState([]);
  const [summary, setSummary] = useState({ total_generations: 0, user_generations_count: 0, admin_generations_count: 0 });
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('all'); // all | users | admin
  const [previewModalImg, setPreviewModalImg] = useState(null);

  const fetchGenerations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/generations?scope=${scope}&limit=50`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setGenerations(data.generations || []);
        if (data.summary) setSummary(data.summary);
      }
    } catch (err) {
      console.error('Erreur chargement générations:', err);
    } finally {
      setLoading(false);
    }
  }, [scope, getAuthHeaders]);

  useEffect(() => {
    fetchGenerations();
  }, [fetchGenerations]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Générations IA (Ideogram 4.0)</h1>
          <p className="admin-page-subtitle">
            Surveillance des rendus, séparation stricte entre créations payantes clients et tests administrateurs.
          </p>
        </div>
      </div>

      {/* KPI Compteurs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Total Générations</span>
            <div className="kpi-card__icon">🎨</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#00E5FF' }}>
            {summary.total_generations}
          </div>
          <div className="kpi-card__sub">Rendus générés via Ideogram 4.0</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Générations Clients (Payantes)</span>
            <div className="kpi-card__icon">💰</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#10B981' }}>
            {summary.user_generations_count}
          </div>
          <div className="kpi-card__sub">Financées par les lots FEFO des forfaits</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__top">
            <span className="kpi-card__label">Générations Admin (Gratuites)</span>
            <div className="kpi-card__icon">🛡️</div>
          </div>
          <div className="kpi-card__value" style={{ color: '#F59E0B' }}>
            {summary.admin_generations_count}
          </div>
          <div className="kpi-card__sub">Exemptées de débit commercial (tests studio)</div>
        </div>
      </div>

      {/* Onglets de séparation stricte */}
      <div className="admin-filter-bar">
        <div className="admin-filter-pills">
          {[
            { id: 'all', label: `Toutes (${summary.total_generations})` },
            { id: 'users', label: `👥 Clients Payants (${summary.user_generations_count})` },
            { id: 'admin', label: `🛡️ Administrateurs (${summary.admin_generations_count})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setScope(tab.id)}
              className={`admin-filter-pill ${scope === tab.id ? 'admin-filter-pill--active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des générations */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Aperçu</th>
              <th>Utilisateur</th>
              <th>Type / Style</th>
              <th>Format</th>
              <th>Modèle IA</th>
              <th>Coût / Crédits</th>
              <th>Statut</th>
              <th>Date & Heure</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Chargement des générations...
                </td>
              </tr>
            ) : generations.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Aucune génération trouvée dans cette catégorie.
                </td>
              </tr>
            ) : (
              generations.map((g) => (
                <tr key={g.id}>
                  <td>
                    {g.url ? (
                      <img
                        src={g.url}
                        alt={g.prompt || 'Génération'}
                        onClick={() => setPreviewModalImg(g.url)}
                        style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 6, border: '1px solid #222', cursor: 'pointer' }}
                      />
                    ) : (
                      <div style={{ width: 54, height: 54, background: '#181818', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
                        —
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>{g.user_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{g.user_email}</div>
                  </td>
                  <td>
                    <div style={{ color: '#00E5FF', fontWeight: 600, textTransform: 'capitalize' }}>
                      {g.type_creation}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#777' }}>{g.style}</div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#AAA' }}>{g.format}</td>
                  <td>
                    <span className="tag tag--cyan">{g.modele}</span>
                  </td>
                  <td>
                    {g.is_admin ? (
                      <span className="tag tag--warning">0 crédit (Admin)</span>
                    ) : (
                      <span style={{ fontWeight: 600, color: '#FFF' }}>
                        {g.credits_utilises} crédits
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="tag tag--success">✓ Réussi</span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#888' }}>
                    {new Date(g.date_creation).toLocaleString('fr-FR')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lightbox / Visionneuse Plein Écran */}
      {previewModalImg && (
        <div
          className="admin-modal-overlay"
          style={{ justifyContent: 'center', alignItems: 'center', cursor: 'zoom-out' }}
          onClick={() => setPreviewModalImg(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewModalImg}
              alt="Aperçu grand format"
              style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, border: '1px solid rgba(0, 229, 255, 0.4)' }}
            />
            <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
              <span style={{ color: '#FFF', background: '#111', padding: '0.4rem 0.8rem', borderRadius: 6, fontSize: '0.82rem' }}>
                Cliquez pour fermer
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
