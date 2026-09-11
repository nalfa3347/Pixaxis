'use client';

import { useState, useEffect, useRef } from 'react';
import ImageLightbox from './ImageLightbox';
import { usePixaxis } from '@/context/PixaxisContext';

/**
 * SearchModal — Modal de recherche connecté aux images réelles Supabase.
 * - Récupère les images créées et importées depuis le cache de session
 * - Filtre en direct instantanément
 * - Chaque résultat est cliquable et ouvre la Lightbox avec téléchargement
 */
export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const inputRef = useRef(null);

  const { createdImages, importedImages, fetchImages } = usePixaxis();

  // Auto-focus au montage
  useEffect(() => {
    inputRef.current?.focus();
    fetchImages('created');
    fetchImages('imported');
  }, [fetchImages]);

  // Fermeture via Échap
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        if (selectedImage) {
          setSelectedImage(null);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, selectedImage]);

  const createdList = (createdImages || []).map((img) => ({
    ...img,
    sourceType: 'created',
    displayName: img.type_creation ? `${img.type_creation} (${img.style || 'Standard'})` : 'Génération IA',
  }));

  const importedList = (importedImages || []).map((img) => ({
    ...img,
    sourceType: 'imported',
    displayName: img.filename || 'Image de référence importée',
  }));

  const allImages = [...createdList, ...importedList];
  const loading = createdImages === null && importedImages === null;

  // Filtrage des résultats selon la requête
  const q = query.trim().toLowerCase();
  const results = allImages.filter((img) => {
    if (!q) return true; // Afficher tout si vide
    const matchPrompt = img.prompt?.toLowerCase().includes(q);
    const matchType = img.type_creation?.toLowerCase().includes(q);
    const matchStyle = img.style?.toLowerCase().includes(q);
    const matchFilename = img.filename?.toLowerCase().includes(q);
    return matchPrompt || matchType || matchStyle || matchFilename;
  });

  return (
    <>
      <div 
        className="modal-overlay" 
        onClick={(e) => e.target === e.currentTarget && onClose()} 
        role="dialog" 
        aria-label="Rechercher"
        style={{ alignItems: 'flex-start', paddingTop: '80px' }}
      >
        <div className="modal-dialog" style={{ maxWidth: 560, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 'var(--text-lg)', color: 'var(--color-text-primary)', margin: 0 }}>
              Recherche dans vos images
            </h2>
            <button className="modal-dialog__close" onClick={onClose} aria-label="Fermer" style={{ position: 'static' }}>
              ✕
            </button>
          </div>

          <div className="search-input-wrapper" style={{ margin: 0, width: '100%' }}>
            <svg className="search-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              className="search-input"
              placeholder="Rechercher par type, style, mot-clé..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Champ de recherche"
            />
          </div>

          <div style={{ marginTop: 'var(--space-md)', overflowY: 'auto', flex: 1, maxHeight: '50vh', paddingRight: 4 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                Recherche en cours...
              </div>
            ) : results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
                {query ? `Aucun résultat pour "${query}"` : 'Aucune image disponible'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
                {results.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => setSelectedImage(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-md)',
                      padding: 'var(--space-sm) var(--space-md)',
                      background: 'var(--color-surface)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-accent)';
                      e.currentTarget.style.background = 'rgba(0, 229, 255, 0.04)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--color-border)';
                      e.currentTarget.style.background = 'var(--color-surface)';
                    }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                      <img src={item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.displayName}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                        {item.sourceType === 'created' ? 'Image IA' : 'Image importée'} • {item.format || 'Standard'}
                      </div>
                    </div>
                    <div style={{ color: 'var(--color-accent)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      Voir →
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox plein écran lors du clic sur un résultat */}
      {selectedImage && (
        <ImageLightbox 
          image={selectedImage} 
          onClose={() => setSelectedImage(null)} 
        />
      )}
    </>
  );
}
