'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import LogoPX from '@/components/LogoPX';
import { 
  CREATION_TYPES, 
  VISUAL_STYLES, 
  FORMATS, 
  MAX_REFERENCE_IMAGES, 
  MAX_ADDITIONAL_PROMPT_LENGTH,
  MAX_CONCURRENT_GENERATIONS,
  IMAGE_ROLES,
  MAX_IMAGE_SIZE_MB 
} from '@/config/constants';
import dynamic from 'next/dynamic';

const ImageLightbox = dynamic(() => import('@/components/ImageLightbox'), { ssr: false });
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

  // État pour l'ajout ultérieur du logo par l'application (pipeline officiel)
  const [isCompositingLogo, setIsCompositingLogo] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoComposited, setLogoComposited] = useState(false);
  const [originalSceneUrl, setOriginalSceneUrl] = useState(null);
  const [compositedUrl, setCompositedUrl] = useState(null);
  const [viewingWithLogo, setViewingWithLogo] = useState(true);
  const [logoPosition, setLogoPosition] = useState('bottom-right');
  const logoInputRef = useRef(null);

  const fileInputRef = useRef(null);

  // Contexte partagé en mémoire (cache instantané de session)
  const {
    creditsData,
    queueData,
    importedImages,
    userProfile,
    fetchCredits,
    fetchQueue,
    fetchImages,
    fetchUserProfile,
    addImportedImages,
    addCreatedImage,
    updateCreatedImage,
    isAuthenticated,
    getAuthHeaders,
  } = usePixaxis();

  const activeLot = creditsData?.fefo_lot || null;
  const queueStatus = queueData || { active_count: 0, max_limit: 10, available_slots: 10, can_queue: true };
  const hasInitializedFormatRef = useRef(false);

  useEffect(() => {
    fetchCredits();
    fetchQueue();
    fetchImages('imported');
    fetchUserProfile();

    // Rafraîchissement périodique de la file glissante (toutes les 15s — suffisant pour le statut)
    const interval = setInterval(() => {
      fetchQueue();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchCredits, fetchQueue, fetchImages, fetchUserProfile]);

  // Initialisation automatique du format selon le profil de marque enregistré
  useEffect(() => {
    if (userProfile?.preferred_format && !hasInitializedFormatRef.current) {
      setSelectedFormat(userProfile.preferred_format);
      hasInitializedFormatRef.current = true;
    }
  }, [userProfile]);

  // Déclencheur pour le bouton "+" : choix entre nouvel import et images déjà importées
  function handlePlusClick() {
    if (selectedImages.length >= MAX_REFERENCE_IMAGES) {
      setErrorMessage('Maximum 3 images de référence autorisées.');
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

    if (selectedImages.length >= MAX_REFERENCE_IMAGES) {
      setErrorMessage('Maximum 3 images de référence autorisées.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const remainingSlots = MAX_REFERENCE_IMAGES - selectedImages.length;
    if (files.length > remainingSlots) {
      setErrorMessage('Maximum 3 images de référence autorisées.');
    }

    // Validation taille : max 5 MB par image
    const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
    for (const file of files) {
      if (file.size > maxBytes) {
        setErrorMessage(`L'image "${file.name}" (${(file.size / 1024 / 1024).toFixed(1)} Mo) dépasse la limite de ${MAX_IMAGE_SIZE_MB} Mo.`);
        return;
      }
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
        headers: getAuthHeaders(),
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

    if (!creditsData || (creditsData.total_credits || 0) <= 0) {
      setErrorMessage('Aucun crédit actif. Vous devez souscrire à un forfait avant de pouvoir créer des visuels.');
      return;
    }

    if (!queueStatus.can_queue) {
      setErrorMessage(`Vous avez déjà ${queueStatus.max_limit} générations en cours, veuillez attendre qu'une place se libère.`);
      return;
    }

    // 1. Sauvegarder les images de référence et le prompt pour cette tâche
    const taskReferenceImages = [...selectedImages];
    const taskPrompt = additionalPrompt.trim();

    if (taskReferenceImages.length > 1) {
      setErrorMessage('Maximum 1 image produit par génération autorisée.');
      return;
    }

    if (taskReferenceImages[0]?.file && taskReferenceImages[0].file.size > 5 * 1024 * 1024) {
      setErrorMessage('Cette image est trop lourde. Taille maximale : 5 MB.');
      return;
    }

    // 2. L'IMAGE ET LE TEXTE QUITTENT IMMÉDIATEMENT LA BARRE DE CHAT
    setSelectedImages([]);
    setAdditionalPrompt('');
    setErrorMessage('');
    setLogoComposited(false);
    setOriginalSceneUrl(null);
    setCompositedUrl(null);
    setViewingWithLogo(true);

    // 3. Activer l'interface de génération 3D en cours sans faux pourcentage ni faux compte à rebours
    setIsGenerating(true);
    setGenerationStep('Génération haute résolution Ideogram 4.0 en cours...');
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

    // Défilement doux vers la génération si besoin
    setTimeout(() => {
      if (generationSectionRef.current) {
        generationSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 80);

    try {
      // Construction du FormData si des images de référence sont présentes
      let fetchOptions;
      if (taskReferenceImages.length > 0) {
        const formData = new FormData();
        formData.append('type', selectedType);
        formData.append('style', selectedStyle);
        formData.append('format', selectedFormat);
        formData.append('additional_prompt', taskPrompt);
        
        // Ajouter les fichiers image dans l'ordre strict des rôles (1: Produit > 2: Logo/Marque > 3: Style/Ambiance)
        for (let i = 0; i < Math.min(taskReferenceImages.length, MAX_REFERENCE_IMAGES); i++) {
          const img = taskReferenceImages[i];
          if (img.file) {
            formData.append('images', img.file, img.name || `ref_${i}.png`);
          } else if (img.url) {
            try {
              const resBlob = await fetch(img.url);
              const blob = await resBlob.blob();
              formData.append('images', blob, img.name || `ref_${i}.png`);
            } catch (err) {
              console.warn('Erreur récupération blob image référence:', err);
            }
          }
        }
        
        fetchOptions = {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        };
      } else {
        fetchOptions = {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            type: selectedType,
            style: selectedStyle,
            format: selectedFormat,
            additional_prompt: taskPrompt,
          }),
        };
      }

      const res = await fetch('/api/generate', fetchOptions);

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

      // Succès : afficher le résultat
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
      setErrorMessage(err.message || 'Erreur lors de la génération');
      setCurrentGeneration(null);
    } finally {
      setIsGenerating(false);
    }
  }

  // ─── Ajout ultérieur du logo de marque (Pipeline officiel PIXAXIS) ───
  async function handleApplyLogo(fileOverride = null) {
    if (!currentGeneration?.resultImage) return;

    const baseImgUrl = originalSceneUrl || currentGeneration.resultImage.original_url || currentGeneration.resultImage.url;
    const file = fileOverride || logoFile;

    // Si aucun fichier n'est fourni et aucun logo enregistré dans le profil, ouvrir la modale
    if (!file && !userProfile?.logo_url) {
      setIsLogoModalOpen(true);
      return;
    }

    setIsCompositingLogo(true);
    setErrorMessage('');

    try {
      let res;
      if (file) {
        const formData = new FormData();
        formData.append('imageId', currentGeneration.resultImage.id || '');
        formData.append('imageUrl', baseImgUrl);
        formData.append('position', logoPosition);
        formData.append('logoFile', file);

        res = await fetch('/api/images/composite-logo', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: formData,
        });
      } else {
        res = await fetch('/api/images/composite-logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            imageId: currentGeneration.resultImage.id || '',
            imageUrl: baseImgUrl,
            logoUrl: userProfile.logo_url,
            position: logoPosition,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’intégration du logo');
      }

      setOriginalSceneUrl(baseImgUrl);
      setCompositedUrl(data.compositedUrl);
      setLogoComposited(true);
      setViewingWithLogo(true);
      setIsLogoModalOpen(false);

      // Mise à jour de l'affichage dans la carte résultat
      setCurrentGeneration((prev) => ({
        ...prev,
        resultImage: {
          ...prev.resultImage,
          url: data.compositedUrl,
          original_url: baseImgUrl,
        },
      }));

      // Mise à jour du cache de session PixaxisContext
      updateCreatedImage({
        id: currentGeneration.resultImage.id,
        url: data.compositedUrl,
        original_url: baseImgUrl,
      });

      if (file) {
        fetchUserProfile(true);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Impossible d’intégrer le logo.');
    } finally {
      setIsCompositingLogo(false);
    }
  }

  function toggleLogoView() {
    if (!compositedUrl || !originalSceneUrl) return;
    const nextWithLogo = !viewingWithLogo;
    setViewingWithLogo(nextWithLogo);
    setCurrentGeneration((prev) => ({
      ...prev,
      resultImage: {
        ...prev.resultImage,
        url: nextWithLogo ? compositedUrl : originalSceneUrl,
      },
    }));
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
            /* Carte 3D premium — profondeur, lumière cyan électrique, halo cyan, animation douce, sans faux compteurs */
            <div className="onboarding-3d-generation-stage" style={{ minHeight: 440, padding: '1.5rem 0' }}>
              <div className="onboarding-3d-scene">
                <div className="onboarding-3d-card">
                  <div className="onboarding-3d-glow-orb onboarding-3d-glow-orb--1" />
                  <div className="onboarding-3d-glow-orb onboarding-3d-glow-orb--2" />

                  <div className="onboarding-3d-card__inner">
                    <div className="onboarding-3d-card__brand">
                      <LogoPX size={42} withText={false} />
                    </div>

                    {currentGeneration.referenceImages?.[0] && (
                      <div className="onboarding-3d-card__preview-thumb">
                        <img
                          src={currentGeneration.referenceImages[0].url || (currentGeneration.referenceImages[0].file ? URL.createObjectURL(currentGeneration.referenceImages[0].file) : '')}
                          alt="Produit de référence"
                        />
                      </div>
                    )}

                    <div className="onboarding-3d-card__pulse-ring" />

                    <div className="onboarding-3d-card__status-text">
                      {generationStep || 'Conception de votre visuel publicitaire...'}
                    </div>

                    <div className="onboarding-3d-card__subtext">
                      Traitement Ideogram 4.0 en cours...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : currentGeneration.status === 'success' && currentGeneration.resultImage ? (
            /* Résultat généré réussi */
            <div>
              {/* Badge d'état du Pipeline publicitaire */}
              <div style={{
                margin: '0 auto var(--space-sm)',
                maxWidth: 480,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px',
                borderRadius: '8px',
                background: logoComposited ? 'rgba(0, 230, 118, 0.12)' : 'rgba(0, 229, 255, 0.08)',
                border: `1px solid ${logoComposited ? 'rgba(0, 230, 118, 0.4)' : 'rgba(0, 229, 255, 0.25)'}`,
                fontSize: '12px',
                color: logoComposited ? 'var(--color-success)' : 'var(--color-accent)',
              }}>
                <span>
                  {logoComposited ? '✓ Logo original superposé avec netteté chirurgicale' : '✦ Scène publicitaire Ideogram 4 prête'}
                </span>
                {logoComposited && originalSceneUrl && (
                  <button
                    type="button"
                    onClick={toggleLogoView}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-primary)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '11px',
                      padding: 0,
                    }}
                  >
                    {viewingWithLogo ? 'Voir scène sans logo' : 'Voir avec logo'}
                  </button>
                )}
              </div>

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
                {!logoComposited && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => handleApplyLogo()}
                    disabled={isCompositingLogo}
                    style={{
                      padding: '8px 16px',
                      fontSize: '13px',
                      borderColor: 'var(--color-accent)',
                      color: 'var(--color-accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Superposer fidèlement votre logo officiel sans aucune déformation IA"
                  >
                    {isCompositingLogo ? (
                      <>
                        <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                        <span>Intégration du logo...</span>
                      </>
                    ) : (
                      <>
                        <span>🏷️ Appliquer mon logo</span>
                        {userProfile?.logo_url && <span style={{ fontSize: '10px', opacity: 0.8 }}>(1-clic)</span>}
                      </>
                    )}
                  </button>
                )}

                {logoComposited && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => setIsLogoModalOpen(true)}
                    style={{ padding: '8px 14px', fontSize: '13px' }}
                    title="Changer de logo ou ajuster la position"
                  >
                    ⚙ Modifier le logo
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn--secondary btn--small"
                  onClick={() => setPreviewImage(currentGeneration.resultImage)}
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  🔍 Agrandir
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={() => downloadImage(currentGeneration.resultImage.url, `pixaxis_${currentGeneration.resultImage.type_creation || 'image'}_${Date.now()}.png`)}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                  id="btn-download-created-card"
                >
                  ⬇ Télécharger {logoComposited && viewingWithLogo ? 'avec logo' : ''}
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

      {/* ─── Profil de marque actif (mémorisé de l'onboarding) ─── */}
      {userProfile?.business_name && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(0, 229, 255, 0.08)',
          border: '1px solid rgba(0, 229, 255, 0.3)',
          borderRadius: '30px',
          padding: '6px 14px',
          marginBottom: '1.25rem',
          fontSize: '0.82rem',
          color: '#00e5ff',
        }}>
          {userProfile.logo_url && (
            <img src={userProfile.logo_url} alt="Logo" style={{ width: '18px', height: '18px', borderRadius: '4px', objectFit: 'contain' }} />
          )}
          <span>✦ Marque active : <strong>{userProfile.business_name}</strong></span>
          {userProfile.marketing_pitch && (
            <span style={{ color: 'rgba(255, 255, 255, 0.45)', fontSize: '0.75rem' }}>
              · {userProfile.marketing_pitch.length > 40 ? `${userProfile.marketing_pitch.slice(0, 40)}...` : userProfile.marketing_pitch}
            </span>
          )}
        </div>
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
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-accent)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.9 }}>
                <span>✦ Pipeline : Image 1 = Produit (référence principale Ideogram 4) • Logo original = conservé séparément et intégré après génération.</span>
              </div>
              <div className="chat-attachments-row">
              {selectedImages.map((img, idx) => (
                <div key={img.id || idx} className="chat-attachment-chip" title={`${IMAGE_ROLES[idx]?.label || 'Référence'} — Cliquez pour agrandir`}>
                  <img 
                    src={img.preview || img.url} 
                    alt={img.name} 
                    onClick={() => setPreviewImage(img)}
                  />
                  {/* Badge du rôle de l'image */}
                  <span className="chat-attachment-role-badge">
                    {idx === 0 ? '📦 Produit (Réf. principale)' : IMAGE_ROLES[idx]?.label || `Image ${idx + 1}`}
                  </span>
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
                                setErrorMessage('Maximum 3 images de référence autorisées.');
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

      {/* ─── Modale d'intégration du logo (Pipeline officiel PIXAXIS) ─── */}
      {isLogoModalOpen && (
        <div className="lightbox-modal" onClick={(e) => e.target === e.currentTarget && setIsLogoModalOpen(false)}>
          <div style={{
            background: 'var(--color-surface-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-xl)',
            maxWidth: 440,
            width: '90%',
            position: 'relative',
          }}>
            <button
              onClick={() => setIsLogoModalOpen(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                fontSize: 20,
                cursor: 'pointer',
              }}
              aria-label="Fermer"
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: '#fff' }}>
              🏷️ Intégrer votre logo de marque
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Le logo original est conservé sans altération IA et superposé avec une netteté chirurgicale sur la scène publicitaire générée par Ideogram 4.
            </p>

            {/* Aperçu du logo actuel s'il existe */}
            {userProfile?.logo_url && !logoPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', marginBottom: 16 }}>
                <img src={userProfile.logo_url} alt="Logo actuel" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: '500' }}>Logo enregistré</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Format officiel conservé</div>
                </div>
              </div>
            )}

            {logoPreview && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: '8px', marginBottom: 16 }}>
                <img src={logoPreview} alt="Nouveau logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', color: '#00e5ff', fontWeight: '500' }}>Nouveau logo sélectionné</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>Prêt pour l’application</div>
                </div>
              </div>
            )}

            {/* Position du logo */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                Position sur la publicité :
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { id: 'bottom-right', label: 'Bas Droite (recommandé)' },
                  { id: 'bottom-left', label: 'Bas Gauche' },
                  { id: 'top-right', label: 'Haut Droite' },
                  { id: 'top-left', label: 'Haut Gauche' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setLogoPosition(pos.id)}
                    style={{
                      padding: '8px 10px',
                      fontSize: '0.78rem',
                      borderRadius: '6px',
                      border: `1px solid ${logoPosition === pos.id ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: logoPosition === pos.id ? 'rgba(0,229,255,0.1)' : 'transparent',
                      color: logoPosition === pos.id ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input file pour nouveau logo */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp,image/jpeg"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setLogoFile(f);
                  setLogoPreview(URL.createObjectURL(f));
                }
              }}
            />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => logoInputRef.current?.click()}
                style={{ flex: 1, fontSize: '0.85rem' }}
              >
                📁 Choisir un fichier
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => handleApplyLogo(logoFile)}
                disabled={isCompositingLogo || (!logoFile && !userProfile?.logo_url)}
                style={{ flex: 1, fontSize: '0.85rem' }}
              >
                {isCompositingLogo ? 'Application...' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

