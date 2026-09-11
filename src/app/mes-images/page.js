'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ImageLightbox from '@/components/ImageLightbox';
import { usePixaxis } from '@/context/PixaxisContext';
import { compressImage } from '@/lib/image-compressor';

/**
 * Page 1 — Mes images
 * Affiche deux catégories avec cache de session en mémoire :
 * 1. Images créées (générées par l'IA)
 * 2. Images importées (références utilisateur) avec bouton "+" flottant
 * 
 * Performance :
 * - Rendu instantané (0ms) dès la première visite de session.
 * - Aucun spinner si les données sont déjà en mémoire.
 * - Réactivité immédiate : les nouvelles créations et imports apparaissent aussitôt.
 */
export default function MesImagesPage() {
  const [activeTab, setActiveTab] = useState('created');
  const [selectedImage, setSelectedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

  const {
    createdImages,
    importedImages,
    isLoadingCreated,
    isLoadingImported,
    fetchImages,
    addImportedImages,
    deleteImportedImage,
  } = usePixaxis();

  // Chargement silencieux en arrière-plan
  useEffect(() => {
    fetchImages(activeTab);
  }, [activeTab, fetchImages]);

  const currentList = activeTab === 'created' ? createdImages : importedImages;
  const isInitialLoading = activeTab === 'created' ? (createdImages === null && isLoadingCreated) : (importedImages === null && isLoadingImported);

  // Import direct d'images depuis le bouton flottant "+"
  async function handleDirectImport(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    try {
      // 1. Compression client en parallèle vers 1024px max (< 50ms par photo)
      const compressedFiles = await Promise.all(
        files.map((file) => compressImage(file, 1024, 0.85))
      );

      const formData = new FormData();
      compressedFiles.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l’envoi des images');

      if (data.images && data.images.length > 0) {
        addImportedImages(data.images);
      }
    } catch (err) {
      alert(err.message || 'Échec de l’import des images');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // Suppression complète et normale d'une image importée
  async function handleDeleteImage(img) {
    if (!img) return;
    try {
      await deleteImportedImage(img.id, img.url);
      if (selectedImage && (selectedImage.id === img.id || selectedImage.url === img.url)) {
        setSelectedImage(null);
      }
    } catch (err) {
      alert(err.message || 'Échec de la suppression de l\'image');
    }
  }

  return (
    <div>
      {/* ─── Onglets ─── */}
      <div className="tabs">
        <button
          className={`tabs__tab ${activeTab === 'created' ? 'tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('created')}
          id="tab-created"
        >
          Images créées {createdImages && createdImages.length > 0 && `(${createdImages.length})`}
        </button>
        <button
          className={`tabs__tab ${activeTab === 'imported' ? 'tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('imported')}
          id="tab-imported"
        >
          Images importées {importedImages && importedImages.length > 0 && `(${importedImages.length})`}
        </button>
      </div>

      {/* ─── État de chargement initial uniquement ─── */}
      {isInitialLoading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--color-text-secondary)' }}>
          <div style={{ display: 'inline-block', width: 32, height: 32, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 'var(--space-md)' }} />
          <div>Chargement de vos images...</div>
        </div>
      ) : !currentList || currentList.length === 0 ? (
        /* ─── États vides ─── */
        activeTab === 'created' ? (
          <div className="empty-state">
            <div className="empty-state__icon">🎨</div>
            <h2 className="empty-state__title">Aucune image créée</h2>
            <p className="empty-state__desc">
              Vos images générées par l'IA apparaîtront ici. Rendez-vous sur la page Créer pour lancer votre première création.
            </p>
            <Link href="/creer" className="btn btn--primary" style={{ marginTop: 'var(--space-md)', textDecoration: 'none' }}>
              Créer une image
            </Link>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon">📁</div>
            <h2 className="empty-state__title">Aucune image importée</h2>
            <p className="empty-state__desc">
              Importez des images depuis votre appareil pour les utiliser comme référence lors de vos créations.
            </p>
            <Link href="/creer" className="btn btn--secondary" style={{ marginTop: 'var(--space-md)', textDecoration: 'none' }}>
              Importer sur la page Créer
            </Link>
          </div>
        )
      ) : (
        /* ─── Grille d'images cliquables compacte avec contraste d'agrandissement ─── */
        <div className="images-grid">
          {currentList.map((img, idx) => (
            <div
              key={img.id || idx}
              className="image-thumb-card"
              onClick={() => setSelectedImage(img)}
              title="Cliquez pour agrandir en grand format net"
            >
              <img
                src={img.url}
                alt={img.prompt || img.filename || 'Image Pixaxis'}
                className="image-thumb-card__img"
                loading="lazy"
                decoding="async"
              />

              {/* Bouton de suppression rapide pour les images importées */}
              {activeTab === 'imported' && (
                <button
                  type="button"
                  className="image-thumb-card__delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Voulez-vous supprimer définitivement cette image importée ?")) {
                      handleDeleteImage(img);
                    }
                  }}
                  title="Supprimer cette image"
                  aria-label="Supprimer cette image"
                >
                  ✕
                </button>
              )}

              <div className="image-thumb-card__overlay">
                <span className="image-thumb-card__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {img.type_creation ? `${img.type_creation}` : img.filename || 'Import'}
                </span>
                <span className="image-thumb-card__meta">
                  {img.date_creation 
                    ? new Date(img.date_creation).toLocaleDateString('fr-FR')
                    : img.date_import 
                    ? new Date(img.date_import).toLocaleDateString('fr-FR') 
                    : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Bouton flottant "+" en bas à droite pour importer des images ─── */}
      {activeTab === 'imported' && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleDirectImport}
            id="mes-images-file-input"
          />
          <button
            type="button"
            className="fab-import-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Importer de nouvelles images depuis cet appareil"
            aria-label="Importer des images"
            id="btn-fab-import"
          >
            {isUploading ? (
              <span style={{
                display: 'inline-block',
                width: 22,
                height: 22,
                border: '2.5px solid #000',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }} />
            ) : (
              '+'
            )}
          </button>
        </>
      )}

      {/* ─── Lightbox Modal au clic sur une image (avec zoom net et suppression) ─── */}
      {selectedImage && (
        <ImageLightbox
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onDelete={activeTab === 'imported' ? handleDeleteImage : null}
        />
      )}
    </div>
  );
}
