'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  CREATION_TYPES, 
  VISUAL_STYLES, 
  FORMATS, 
  MAX_REFERENCE_IMAGES, 
  MAX_ADDITIONAL_PROMPT_LENGTH,
  MAX_CONCURRENT_GENERATIONS 
} from '@/config/constants';
import ImageLightbox from '@/components/ImageLightbox';
import { compressImage } from '@/lib/image-compressor';
import { usePixaxis } from '@/context/PixaxisContext';
import { downloadImage } from '@/lib/download-helper';

/**
 * Page 2 — Créer
 * Page centrale de l'application :
 * - Import d'image de référence directement dans la barre de chat avec chargement instantané (< 50ms)
 * - Au lancement, l'image quitte la barre de saisie et s'affiche dans le signal ChatGPT "Création de l'image"
 * - Signal visuel avec matrice de points animée, pourcentage en temps réel et vignette de référence attachée
 * - Sélecteurs avec retour visuel immédiat (cyan + halo + coche ✓)
 */
export default function CreerPage() {
  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedType, setSelectedType] = useState(CREATION_TYPES[0].id);
  const [selectedStyle, setSelectedStyle] = useState(VISUAL_STYLES[0].id);
  const [selectedFormat, setSelectedFormat] = useState(FORMATS[0].id);
  const [additionalPrompt, setAdditionalPrompt] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedResult, setGeneratedResult] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPickerModalOpen, setIsPickerModalOpen] = useState(false);

  // État de génération en cours (Signal style ChatGPT avec pourcentage et image de référence)
  const [currentGeneration, setCurrentGeneration] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(14);
  const progressTimerRef = useRef(null);
  const generationSectionRef = useRef(null);

  const fileInputRef = useRef(null);

  // Contexte partagé en mémoire (cache instantané de session)
  const {
    creditsData,
    queueData,
    importedImages,
    fetchCredits,
    fetchQueue,
    fetchImages,
    addImportedImages,
    addCreatedImage,
  } = usePixaxis();

  const activeLot = creditsData?.fefo_lot || null;
  const queueStatus = queueData || { active_count: 0, max_limit: 10, available_slots: 10, can_queue: true };

  useEffect(() => {
    fetchCredits();
    fetchQueue();
    fetchImages('imported');

    // Rafraîchissement périodique de la file glissante (toutes les 15s — suffisant pour le statut)
    const interval = setInterval(() => {
      fetchQueue();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchCredits, fetchQueue, fetchImages]);

  // Déclencheur pour le bouton "+" : choix entre nouvel import et images déjà importées
  function handlePlusClick() {
    if (selectedImages.length >= MAX_REFERENCE_IMAGES) {
      alert(`Vous avez atteint la limite maximale de ${MAX_REFERENCE_IMAGES} images.`);
      return;
    }
    
    // Si l'utilisateur possède déjà des images importées dans sa bibliothèque, ouvrir le sélecteur
    if (importedImages && importedImages.length > 0) {
      setIsPickerModalOpen(true);
    } else {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  }

  // Traitement de la sélection de fichiers avec affichage optimiste instantané (< 10ms)
  async function handleFilesSelected(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_REFERENCE_IMAGES - selectedImages.length;
    if (files.length > remainingSlots) {
      setErrorMessage(`Vous ne pouvez ajouter que ${remainingSlots} image(s) supplémentaire(s) (maximum ${MAX_REFERENCE_IMAGES}).`);
    }

    const filesToUpload = files.slice(0, remainingSlots);

    // 1. APPARITION IMMÉDIATE DANS LA BARRE DE CHAT (< 10ms grâce à l'URL locale)
    const localItems = filesToUpload.map((file, i) => ({
      id: `local_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
      file: file,
      preview: URL.createObjectURL(file),
      name: file.name || 'image.png',
      isUploading: true,
      url: null,
    }));

    setSelectedImages((prev) => [...prev, ...localItems].slice(0, MAX_REFERENCE_IMAGES));
    setIsUploading(true);
    setUploadProgressText('Optimisation instantanée...');
    setErrorMessage('');

    // 2. Traitement d'optimisation (compression Canvas 1024px < 40ms) et envoi Supabase en tâche de fond
    try {
      const compressedFiles = await Promise.all(
        filesToUpload.map((file) => compressImage(file, 1024, 0.85))
      );

      const formData = new FormData();
      compressedFiles.forEach((f) => formData.append('files', f));

      const res = await fetch('/api/images', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l’envoi des images');

      // Mise à jour de l'URL Supabase réelle dès réception
      setSelectedImages((prev) =>
        prev.map((item) => {
          const idx = localItems.findIndex((li) => li.id === item.id);
          if (idx !== -1 && data.images && data.images[idx]) {
            return {
              ...item,
              url: data.images[idx].url,
              id: data.images[idx].id || item.id,
              isUploading: false,
            };
          }
          return item;
        })
      );

      if (data.images && data.images.length > 0) {
        addImportedImages(data.images);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Échec de l’envoi des images');
      // Retrait des éléments échoués
      setSelectedImages((prev) => prev.filter((item) => !localItems.some((li) => li.id === item.id)));
    } finally {
      setIsUploading(false);
      setUploadProgressText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(index) {
    setSelectedImages((prev) => prev.filter((_, idx) => idx !== index));
  }

  // Lancement de la génération avec signal ChatGPT et retrait immédiat de l'image de la barre
  async function handleGenerate() {
    if (!selectedType || !selectedStyle || !selectedFormat) {
      setErrorMessage('Veuillez sélectionner un type, un style et un format.');
      return;
    }

    if (!queueStatus.can_queue) {
      setErrorMessage(`Vous avez déjà ${queueStatus.max_limit} générations en cours, veuillez attendre qu'une place se libère.`);
      return;
    }

    // 1. Sauvegarder les images de référence et le prompt pour cette tâche
    const taskReferenceImages = [...selectedImages];
    const taskPrompt = additionalPrompt.trim();

    // 2. L'IMAGE ET LE TEXTE QUITTENT IMMÉDIATEMENT LA BARRE DE CHAT
    setSelectedImages([]);
    setAdditionalPrompt('');
    setErrorMessage('');

    // 3. Activer le signal visuel style ChatGPT ("Création de l'image") avec les images de référence associées
    setIsGenerating(true);
    setGenerationProgress(14);
    setGenerationStep('Composition et analyse de l\'image...');
    setCurrentGeneration({
      id: Date.now(),
      prompt: taskPrompt,
      type: selectedType,
      style: selectedStyle,
      format: selectedFormat,
      referenceImages: taskReferenceImages,
      status: 'in_progress',
      resultImage: null,
    });

    // Défilement doux vers le signal si besoin
    setTimeout(() => {
      if (generationSectionRef.current) {
        generationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);

    // Progression animée du pourcentage (comme dans la capture ChatGPT : 14% -> 28% -> 48% -> 72% -> 88% -> 95%)
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev < 28) return prev + 7;
        if (prev < 54) return prev + 5;
        if (prev < 78) return prev + 4;
        if (prev < 90) return prev + 2;
        if (prev < 96) return prev + 1;
        return prev;
      });
    }, 450);

    const stepTimer1 = setTimeout(() => {
      setGenerationStep('Génération haute résolution par l\'IA...');
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Synthèse des détails et colorimétrie...');
    }, 3200);

    try {
      // Résolution des URLs des images de référence
      let resolvedRefs = taskReferenceImages.map((img) => img.url).filter(Boolean);
      if (resolvedRefs.length < taskReferenceImages.length) {
        await new Promise((r) => setTimeout(r, 600));
        resolvedRefs = taskReferenceImages.map((img) => img.url).filter(Boolean);
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          style: selectedStyle,
          format: selectedFormat,
          additional_prompt: taskPrompt,
          reference_images: resolvedRefs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error(data.error || 'File pleine : 10 générations en cours.');
        }
        if (res.status === 402) {
          throw new Error(data.error || 'Crédits insuffisants.');
        }
        throw new Error(data.error || 'Échec de la génération.');
      }

      // Succès : Passer le pourcentage à 100% et afficher le résultat
      clearInterval(progressTimerRef.current);
      setGenerationProgress(100);
      setGenerationStep('Création terminée avec succès !');

      if (data.image) {
        addCreatedImage(data.image, data.credits_deducted || 0);
        setCurrentGeneration((prev) => ({
          ...prev,
          status: 'success',
          resultImage: data.image,
        }));
      }

      // Rafraîchir les compteurs en tâche de fond
      fetchCredits(true);
      fetchQueue();
    } catch (err) {
      clearInterval(progressTimerRef.current);
      setErrorMessage(err.message || 'Erreur lors de la génération');
      setCurrentGeneration(null);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearInterval(progressTimerRef.current);
      setIsGenerating(false);
    }
  }

  return (
    <div style={{ paddingBottom: '260px' }}>
      {/* ─── Indicateur de file d'attente glissante ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Studio de Création</h2>
        <div className="queue-badge" title="File de génération glissante (places libérées en temps réel)">
          <span className="queue-badge__dot" style={{ backgroundColor: queueStatus.active_count >= 10 ? 'var(--color-error)' : 'var(--color-accent)' }} />
          <span>{queueStatus.active_count} sur {queueStatus.max_limit} en cours</span>
        </div>
      </div>

      {/* Message d'erreur visible */}
      {errorMessage && (
        <div style={{
          padding: 'var(--space-md)',
          background: 'rgba(255, 68, 68, 0.15)',
          border: '1px solid var(--color-error)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-error)',
          marginBottom: 'var(--space-lg)',
          fontSize: 'var(--text-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{errorMessage}</span>
          {errorMessage.includes('Crédit') && (
            <Link href="/profil" className="btn btn--primary btn--small" style={{ marginLeft: 12, textDecoration: 'none' }}>
              Acheter un pack
            </Link>
          )}
        </div>
      )}

      {/* Input file caché ancré au DOM pour le bouton "+" de la barre de chat */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFilesSelected}
        id="pixaxis-file-input"
      />

      {/* ─── Signal ChatGPT "Création de l'image" (Visible dès le lancement avec image de référence) ─── */}
      {currentGeneration && (
        <section ref={generationSectionRef} className="chatgpt-creation-card">
          <div className="chatgpt-creation-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="chatgpt-spark-icon">✦</span>
              <h3 className="chatgpt-creation-title">
                {currentGeneration.status === 'in_progress' ? "Création de l'image" : "Image créée"}
              </h3>
            </div>

            {/* L'image importée se retrouve ici avec le signal ! */}
            {currentGeneration.referenceImages && currentGeneration.referenceImages.length > 0 && (
              <div className="chatgpt-ref-images-badge" title="Image(s) de référence utilisée(s)">
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginRight: 6 }}>
                  Référence{currentGeneration.referenceImages.length > 1 ? 's' : ''} :
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {currentGeneration.referenceImages.map((refImg, rIdx) => (
                    <div 
                      key={refImg.id || rIdx}
                      onClick={() => setPreviewImage(refImg)}
                      className="chatgpt-ref-thumb"
                      title="Cliquez pour agrandir l'image de référence"
                    >
                      <img 
                        src={refImg.preview || refImg.url} 
                        alt="Référence" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {currentGeneration.status === 'in_progress' ? (
            /* Matrice de points avec lueur et pourcentage comme dans la capture ChatGPT */
            <div className="chatgpt-dot-matrix-container">
              <div className="chatgpt-dot-matrix">
                <div className="chatgpt-matrix-dots" />
                <div className="chatgpt-matrix-shimmer" />

                {/* Pourcentage en bas à droite */}
                <div className="chatgpt-progress-pill">
                  {generationProgress}%
                </div>
              </div>

              <div style={{ marginTop: 12, width: '100%', maxWidth: 480, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-accent)', display: 'inline-block', animation: 'pulseDot 1.5s infinite' }} />
                  {generationStep || "Génération par l'IA en cours..."}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'var(--weight-semibold)' }}>
                  {currentGeneration.type} • {currentGeneration.style}
                </span>
              </div>
            </div>
          ) : currentGeneration.status === 'success' && currentGeneration.resultImage ? (
            /* Résultat généré réussi */
            <div>
              <div style={{ position: 'relative', width: '100%', maxWidth: 480, margin: '0 auto', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-accent)', boxShadow: '0 12px 36px rgba(0, 229, 255, 0.25)' }}>
                <img 
                  src={currentGeneration.resultImage.url} 
                  alt={currentGeneration.resultImage.prompt || 'Image générée'} 
                  style={{ width: '100%', display: 'block', imageRendering: '-webkit-optimize-contrast', cursor: 'zoom-in' }}
                  onClick={() => setPreviewImage(currentGeneration.resultImage)}
                  title="Cliquez pour agrandir en plein écran"
                />
              </div>

              <div style={{ marginTop: 'var(--space-md)', display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => setPreviewImage(currentGeneration.resultImage)}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  🔍 Agrandir en grand format
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={() => downloadImage(currentGeneration.resultImage.url, `pixaxis_${currentGeneration.resultImage.type_creation || 'image'}_${Date.now()}.png`)}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  id="btn-download-created-card"
                >
                  ⬇ Télécharger l'image
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--small"
                  onClick={() => setCurrentGeneration(null)}
                  style={{ padding: '8px 12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}
                >
                  Masquer
                </button>
              </div>
            </div>
          ) : null}
        </section>
      )}

      {/* ─── 1. Type de création ─── */}
      <section className="mb-xl">
        <h3 className="section-title" style={{ fontSize: 'var(--text-base)' }}>1. Type de création</h3>
        <div className="selector-grid selector-grid--types">
          {CREATION_TYPES.map((type) => {
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                className={`selector-item ${isSelected ? 'selector-item--selected' : ''}`}
                onClick={() => setSelectedType(type.id)}
                aria-pressed={isSelected}
                id={`type-${type.id}`}
              >
                {isSelected && <span className="selector-item__check">✓</span>}
                <span className="selector-item__icon">{type.icon}</span>
                <span className="selector-item__label">{type.label}</span>
                <span className="selector-item__desc">{type.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── 2. Style visuel ─── */}
      <section className="mb-xl">
        <h3 className="section-title" style={{ fontSize: 'var(--text-base)' }}>2. Style visuel</h3>
        <div className="selector-grid selector-grid--styles">
          {VISUAL_STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                className={`selector-item ${isSelected ? 'selector-item--selected' : ''}`}
                onClick={() => setSelectedStyle(style.id)}
                aria-pressed={isSelected}
                id={`style-${style.id}`}
              >
                {isSelected && <span className="selector-item__check">✓</span>}
                <span className="selector-item__label">{style.label}</span>
                <span className="selector-item__desc">{style.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── 3. Format ─── */}
      <section className="mb-xl">
        <h3 className="section-title" style={{ fontSize: 'var(--text-base)' }}>3. Format</h3>
        <div className="selector-grid selector-grid--formats">
          {FORMATS.map((format) => {
            const isSelected = selectedFormat === format.id;
            return (
              <button
                key={format.id}
                type="button"
                className={`selector-item ${isSelected ? 'selector-item--selected' : ''}`}
                onClick={() => setSelectedFormat(format.id)}
                aria-pressed={isSelected}
                id={`format-${format.id}`}
              >
                {isSelected && <span className="selector-item__check">✓</span>}
                <span className="selector-item__label">{format.label}</span>
                <span className="selector-item__desc">{format.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── 5. Champ de prompt / Barre de chat épinglée (STICKY) en bas ─── */}
      <div className="sticky-prompt-container">
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          {/* Alerte d'erreur directement visible dans la barre si un problème survient */}
          {errorMessage && (
            <div style={{
              padding: '8px 12px',
              background: 'rgba(255, 68, 68, 0.18)',
              border: '1px solid var(--color-error)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-error)',
              marginBottom: 8,
              fontSize: 'var(--text-xs)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>⚠️ {errorMessage}</span>
              {errorMessage.includes('Crédit') ? (
                <Link href="/profil" className="btn btn--primary btn--small" style={{ padding: '2px 8px', fontSize: '11px', textDecoration: 'none' }}>
                  Acheter un pack
                </Link>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setErrorMessage('')} 
                  style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: 14 }}
                  aria-label="Fermer le message"
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* En-tête de la barre de saisie : Libellé + Pack actif + Compteur de caractères */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label 
                htmlFor="additional-prompt-input"
                style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-semibold)' }}
              >
                Précision ou prompt (optionnel)
              </label>
              {activeLot && (
                <span style={{ fontSize: '11px', color: 'var(--color-accent)', background: 'rgba(0, 229, 255, 0.1)', padding: '2px 6px', borderRadius: 4 }}>
                  Pack {activeLot.pack_name} ({activeLot.credits_restants} cr.)
                </span>
              )}
            </div>

            <span className={`sticky-prompt-counter ${additionalPrompt.length >= MAX_ADDITIONAL_PROMPT_LENGTH ? 'sticky-prompt-counter--max' : additionalPrompt.length > 0 ? 'sticky-prompt-counter--active' : ''}`}>
              {additionalPrompt.length} / {MAX_ADDITIONAL_PROMPT_LENGTH} car.
            </span>
          </div>

          {/* Pièces jointes attachées sur la ligne du chat */}
          {selectedImages.length > 0 && (
            <div className="chat-attachments-row">
              {selectedImages.map((img, idx) => (
                <div key={img.id || idx} className="chat-attachment-chip" title="Cliquez pour agrandir">
                  <img 
                    src={img.preview || img.url} 
                    alt={img.name} 
                    onClick={() => setPreviewImage(img)}
                  />
                  {img.isUploading && (
                    <div className="chat-attachment-spinner">
                      <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="chat-attachment-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(idx);
                    }}
                    title="Retirer cette image"
                    aria-label="Retirer l'image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {selectedImages.length < MAX_REFERENCE_IMAGES && (
                <button
                  type="button"
                  className="chat-attachment-add-more"
                  onClick={handlePlusClick}
                  disabled={isUploading}
                  title={`Ajouter une autre image (${selectedImages.length}/${MAX_REFERENCE_IMAGES})`}
                  aria-label="Ajouter une autre image"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Zone de chat : Bouton "+" + Textarea multiligne + Bouton d'envoi / génération */}
          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-end' }}>
            <button
              type="button"
              className="chat-attach-btn"
              onClick={handlePlusClick}
              disabled={selectedImages.length >= MAX_REFERENCE_IMAGES || isUploading}
              title={`Ajouter des images de référence (${selectedImages.length}/${MAX_REFERENCE_IMAGES} max)`}
              aria-label="Ajouter une image de référence"
              id="btn-chat-attach"
            >
              {isUploading ? (
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </button>

            <div className="sticky-prompt-input-wrapper">
              <textarea
                id="additional-prompt-input"
                rows={1}
                className="sticky-prompt-textarea"
                placeholder="Décrivez un détail ou une ambiance (ex : dominante or et émeraude, vue de face...)"
                maxLength={MAX_ADDITIONAL_PROMPT_LENGTH}
                value={additionalPrompt}
                onChange={(e) => {
                  setAdditionalPrompt(e.target.value.slice(0, MAX_ADDITIONAL_PROMPT_LENGTH));
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isGenerating && queueStatus.can_queue) {
                      handleGenerate();
                    }
                  }
                }}
              />

              {additionalPrompt.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAdditionalPrompt('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-tertiary)',
                    cursor: 'pointer',
                    padding: '4px 6px',
                    fontSize: 13,
                    borderRadius: 4,
                  }}
                  title="Effacer le message"
                  aria-label="Effacer le message"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn btn--primary btn-generate-compact"
              onClick={handleGenerate}
              disabled={isGenerating || !queueStatus.can_queue}
              id="btn-generate-main"
            >
              {isGenerating ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 12, height: 12, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span>En cours...</span>
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontWeight: 'var(--weight-bold)' }}>Générer</span>
                  {activeLot && (
                    <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: 'normal' }}>
                      ({activeLot.cout_par_generation}cr)
                    </span>
                  )}
                </span>
              )}
            </button>
          </div>

          {/* Indicateur d'étape de génération visible */}
          {isGenerating && (
            <div style={{
              marginTop: 8,
              padding: '6px 12px',
              background: 'rgba(0, 229, 255, 0.08)',
              border: '1px solid rgba(0, 229, 255, 0.3)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                border: '2px solid var(--color-accent)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 'var(--weight-medium)' }}>
                {generationStep || "Prise en compte de votre création..."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Lightbox si une image de référence est cliquée (vrai agrandissement net) ─── */}
      {previewImage && (
        <ImageLightbox
          image={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* ─── Lightbox si une image vient d'être générée ─── */}
      {generatedResult && (
        <ImageLightbox
          image={generatedResult}
          onClose={() => setGeneratedResult(null)}
        />
      )}

      {/* ─── Modal de choix d'images de référence (Appareil OU Bibliothèque importée) ─── */}
      {isPickerModalOpen && (
        <div 
          className="picker-modal-backdrop" 
          onClick={(e) => e.target === e.currentTarget && setIsPickerModalOpen(false)}
        >
          <div className="picker-modal-content">
            <div className="picker-modal-header">
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', color: '#fff' }}>Images de référence</h3>
              <button 
                type="button" 
                onClick={() => setIsPickerModalOpen(false)}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--color-text-secondary)', 
                  fontSize: 22, 
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <div className="picker-modal-body">
              {/* Option 1 : Importer depuis l'appareil */}
              <div>
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => {
                    setIsPickerModalOpen(false);
                    if (fileInputRef.current) fileInputRef.current.click();
                  }}
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 10,
                    padding: '12px var(--space-md)'
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Importer depuis cet appareil (photo, fichier)</span>
                </button>
              </div>

              {/* Option 2 : Choisir parmi les images déjà importées */}
              {importedImages && importedImages.length > 0 && (
                <div style={{ marginTop: 'var(--space-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-semibold)' }}>
                      Ou sélectionner parmi vos images importées :
                    </span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-accent)' }}>
                      {selectedImages.length} / {MAX_REFERENCE_IMAGES} max
                    </span>
                  </div>

                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(85px, 1fr))', 
                    gap: 8, 
                    maxHeight: 280, 
                    overflowY: 'auto',
                    padding: 4,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-elevated)'
                  }}>
                    {importedImages.map((img) => {
                      const isSelected = selectedImages.some((s) => s.url === img.url || (s.id && s.id === img.id));
                      return (
                        <div
                          key={img.id || img.url}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedImages((prev) => prev.filter((s) => s.url !== img.url && s.id !== img.id));
                            } else {
                              if (selectedImages.length >= MAX_REFERENCE_IMAGES) {
                                alert(`Limite de ${MAX_REFERENCE_IMAGES} images de référence atteinte.`);
                                return;
                              }
                              setSelectedImages((prev) => [...prev, {
                                url: img.url,
                                preview: img.url,
                                name: img.filename || 'image_reference.png',
                                id: img.id,
                              }]);
                            }
                          }}
                          style={{
                            position: 'relative',
                            aspectRatio: 1,
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-border)',
                            boxShadow: isSelected ? '0 0 10px rgba(0, 229, 255, 0.4)' : 'none',
                            transition: 'border-color 0.15s',
                          }}
                          title={isSelected ? 'Cliquez pour désélectionner' : 'Cliquez pour sélectionner'}
                        >
                          <img 
                            src={img.url} 
                            alt={img.filename || 'Import'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                          {isSelected && (
                            <div style={{
                              position: 'absolute',
                              inset: 0,
                              background: 'rgba(0, 229, 255, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#fff',
                              fontSize: 20,
                              fontWeight: 'bold',
                              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bouton de validation */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-md)', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setIsPickerModalOpen(false)}
                >
                  Valider ({selectedImages.length} sélectionnée{selectedImages.length > 1 ? 's' : ''})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

