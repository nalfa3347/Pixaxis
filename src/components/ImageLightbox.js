'use client';

import { useState, useEffect } from 'react';
import { downloadImage } from '@/lib/download-helper';

/**
 * ImageLightbox — Affichage plein écran d'une image avec vrai agrandissement net,
 * zoom haute résolution, suppression complète (images importées) et téléchargement direct.
 */
export default function ImageLightbox({ image, onClose, onDelete }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!image) return null;

  const isImported = Boolean(image.date_import || image.filename);
  const downloadName = image.filename || `pixaxis_${image.type_creation || 'image'}_${Date.now()}.png`;

  async function handleDownloadClick() {
    setIsDownloading(true);
    try {
      await downloadImage(image.url, downloadName);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(image);
      onClose();
    } catch (err) {
      alert(err.message || 'Échec de la suppression de l\'image');
      setIsDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="lightbox-modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Bouton de fermeture */}
      <button 
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          background: 'rgba(0,0,0,0.7)',
          border: '1px solid var(--color-border)',
          color: '#fff',
          borderRadius: '50%',
          width: 40,
          height: 40,
          fontSize: 20,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
        aria-label="Fermer"
      >
        ✕
      </button>

      {/* Zone de visualisation nette avec zoom interactif */}
      <div className="lightbox-viewer" onClick={() => setIsZoomed(!isZoomed)}>
        <img 
          src={image.url} 
          alt={image.prompt || image.filename || 'Image Pixaxis'} 
          className={`lightbox-image ${isZoomed ? 'lightbox-image--zoomed' : ''}`}
          loading="eager"
          decoding="async"
          title={isZoomed ? 'Cliquez pour réduire' : 'Cliquez pour agrandir en net (zoom 140%)'}
        />
      </div>

      {/* Informations de l'image */}
      <div style={{ marginTop: 'var(--space-sm)', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
        {image.type_creation && (
          <span style={{ textTransform: 'capitalize', color: 'var(--color-accent)', marginRight: 10, fontWeight: 'var(--weight-semibold)' }}>
            {image.type_creation} ({image.style} • {image.format})
          </span>
        )}
        {image.date_creation && (
          <span>Créée le {new Date(image.date_creation).toLocaleDateString('fr-FR')}</span>
        )}
        {image.date_import && (
          <span>Importée le {new Date(image.date_import).toLocaleDateString('fr-FR')}</span>
        )}
        <span style={{ marginLeft: 12, color: 'var(--color-text-tertiary)' }}>
          {isZoomed ? '🔍 Zoom net actif (cliquez pour ajuster)' : '🔎 Cliquez sur l\'image pour zoomer'}
        </span>
      </div>

      {/* Barre d'actions */}
      <div className="lightbox-actions">
        {/* Bouton bascule zoom */}
        <button
          type="button"
          onClick={() => setIsZoomed(!isZoomed)}
          className="btn btn--secondary"
          style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}
        >
          {isZoomed ? 'Ajuster à l\'écran' : 'Zoom net 100%'}
        </button>

        {/* Bouton de suppression pour image importée */}
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="btn btn--danger"
            style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}
          >
            {isDeleting ? 'Suppression...' : confirmDelete ? 'Confirmer la suppression ?' : 'Supprimer'}
          </button>
        )}

        {/* Bouton téléchargement réel */}
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="btn btn--primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', fontSize: 'var(--text-sm)' }}
          id="btn-download-lightbox"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isDownloading ? 'Enregistrement...' : 'Télécharger'}
        </button>
      </div>
    </div>
  );
}

