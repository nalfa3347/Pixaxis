'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePixaxis } from '@/context/PixaxisContext';

export default function AdminAuditPage() {
  const { getAuthHeaders } = usePixaxis();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Erreur chargement audit:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Journal d’Audit & Sécurité</h1>
          <p className="admin-page-subtitle">
            Traçabilité des accès aux données sensibles, consultations de fiches clients et actions administratives.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchAuditLogs}
          className="admin-btn admin-btn--secondary admin-btn--sm"
        >
          ⟳ Rafraîchir
        </button>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Administrateur</th>
              <th>Action</th>
              <th>Cible</th>
              <th>Résultat</th>
              <th>Détails</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Chargement des journaux de sécurité...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
                  Aucun journal d’audit enregistré pour l’instant.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.8rem', color: '#AAA' }}>
                    {new Date(log.created_at).toLocaleString('fr-FR')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFF' }}>{log.admin_email}</div>
                  </td>
                  <td>
                    <span className="tag tag--neutral">{log.action}</span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: '#00E5FF' }}>
                    {log.target || '—'}
                  </td>
                  <td>
                    <span className={`tag ${log.result === 'success' ? 'tag--success' : 'tag--danger'}`}>
                      {log.result}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#777', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {JSON.stringify(log.metadata || {})}
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
