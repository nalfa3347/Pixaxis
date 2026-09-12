'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LogoPX from '@/components/LogoPX';
import { usePixaxis } from '@/context/PixaxisContext';
import { FORMATS, CREATION_TYPES, VISUAL_STYLES } from '@/config/constants';
import { downloadImage } from '@/lib/download-helper';

export default function OnboardingPage() {
  const router = useRouter();
  const {
    user,
    session,
    isAuthenticated,
    authInitialized,
    getAuthHeaders,
    addImportedImages,
    addCreatedImage,
    fetchCredits,
  } = usePixaxis();

  // Étape courante (1 à 4, ou 'generating', 'result')
  const [currentStep, setCurrentStep] = useState(1);

  // Étape 1 : Premier Produit
  const [productFile, setProductFile] = useState(null);
  const [productPreview, setProductPreview] = useState(null);
  const [productUrl, setProductUrl] = useState(null);
  const [isUploadingProduct, setIsUploadingProduct] = useState(false);
  const [productError, setProductError] = useState('');

  // Étape 2 : Informations Business
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [marketingPitch, setMarketingPitch] = useState('');

  // Étape 3 : Format préféré
  const [selectedFormat, setSelectedFormat] = useState('1024x1024');

  // Étape 4 : Première Demande
  const [userPrompt, setUserPrompt] = useState('');

  // Écran de Génération & Traitement
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('Initialisation de votre premier visuel...');
  const [generationError, setGenerationError] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);

  // Notation post-génération
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  // Modal / Ajout du Logo
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isCompositingLogo, setIsCompositingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');

  // Refs
  const productInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Protection d'authentification
  useEffect(() => {
    if (authInitialized && !isAuthenticated) {
      router.replace('/connexion?redirect=/onboarding');
    }
  }, [authInitialized, isAuthenticated, router]);

  // Initialiser le nom si stocké localement
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('pixaxis_user_name');
      const storedPhone = localStorage.getItem('pixaxis_user_phone');
      if (storedName && !fullName) setFullName(storedName);
      if (storedPhone && !phone) setPhone(storedPhone);
    }
  }, []);

  // ─── Gestion de l'image Produit (Étape 1) ───────────────────────
  const handleProductFile = async (file) => {
    setProductError('');
    if (!file) return;

    // Validation stricte 5 Mo
    const MAX_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setProductError('Cette image est trop lourde. La taille maximale est de 5 MB.');
      return;
    }

    setProductFile(file);
    const localUrl = URL.createObjectURL(file);
    setProductPreview(localUrl);

    // Upload & optimisation serveur avec Sharp en tâche de fond
    setIsUploadingProduct(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/onboarding/product', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’envoi de l’image');
      }

      setProductUrl(data.url);
      if (addImportedImages) {
        addImportedImages([{ url: data.url, filename: file.name, date_import: new Date().toISOString() }]);
      }
    } catch (err) {
      console.warn('Erreur upload produit:', err);
      setProductError(err.message || 'Échec de l’envoi du produit.');
    } finally {
      setIsUploadingProduct(false);
    }
  };

  const removeProductImage = () => {
    setProductFile(null);
    setProductPreview(null);
    setProductUrl(null);
    setProductError('');
    if (productInputRef.current) productInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  // ─── Sauvegarde du profil Business (Étape 2 & 3) ────────────────
  const saveBusinessProfile = async () => {
    try {
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          fullName: fullName.trim() || undefined,
          phone: phone.trim() || undefined,
          businessName: businessName.trim() || undefined,
          businessAddress: businessAddress.trim() || undefined,
          marketingPitch: marketingPitch.trim() || undefined,
          preferredFormat: selectedFormat || '1024x1024',
        }),
      });
    } catch (err) {
      console.warn('Erreur sauvegarde profil onboarding:', err);
    }
  };

  // ─── Navigation entre étapes (Toutes 100% facultatives) ──────────
  const goToNextStep = async () => {
    if (currentStep === 2) {
      saveBusinessProfile();
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const skipStep = async () => {
    if (currentStep === 2) {
      saveBusinessProfile();
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  // ─── Lancement de la Génération du Premier Visuel Pro ───────────
  const handleFinalGenerate = async () => {
    setIsGenerating(true);
    setGenerationError('');
    setCurrentStep('generating');
    setGenerationPhase('Conception de votre visuel publicitaire...');

    // Sauvegarder toutes les infos business disponibles en parallèle
    saveBusinessProfile();

    try {
      // Préparation de la requête de génération
      const formData = new FormData();
      formData.append('type', 'product');
      formData.append('style', 'realistic');
      formData.append('format', selectedFormat || '1024x1024');

      if (userPrompt?.trim()) {
        formData.append('additional_prompt', userPrompt.trim());
      }

      // Si un produit a été fourni
      if (productFile) {
        formData.append('images', productFile);
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du visuel.');
      }

      setGeneratedImage(data.image);
      if (addCreatedImage) {
        addCreatedImage(data.image, data.credits_deducted || 0);
      }
      fetchCredits(true);

      // Transition fluide vers l'écran de résultat
      setTimeout(() => {
        setIsGenerating(false);
        setCurrentStep('result');
      }, 600);
    } catch (err) {
      console.error('Erreur génération onboarding:', err);
      setGenerationError(err.message || 'Une erreur est survenue lors de la création.');
      setIsGenerating(false);
    }
  };

  // ─── Soumission de la note (Étoiles) ────────────────────────────
  const handleRate = async (stars) => {
    setRating(stars);
    setRatingSubmitted(true);
    if (!generatedImage?.id) return;

    try {
      await fetch('/api/onboarding/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ imageId: generatedImage.id, rating: stars }),
      });
    } catch (e) {
      console.warn('Erreur notation:', e);
    }
  };

  // ─── Gestion du Logo & Incrustation Sharp ───────────────────────
  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    setLogoError('');
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Le fichier logo dépasse la limite de 5 MB.');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleSendLogo = async () => {
    if (!logoFile || !generatedImage) return;

    setIsLogoModalOpen(false);
    setIsCompositingLogo(true);
    setGenerationPhase('Intégration haute précision de votre logo...');

    try {
      const formData = new FormData();
      formData.append('imageId', generatedImage.id || '');
      formData.append('imageUrl', generatedImage.url || '');
      formData.append('logoFile', logoFile);

      const res = await fetch('/api/onboarding/composite-logo', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de l’intégration du logo.');
      }

      setGeneratedImage((prev) => ({
        ...prev,
        url: data.compositedUrl,
        original_url: data.originalUrl || prev?.url,
      }));

      // Attente visuelle douce de 500ms pour apprécier la transition
      setTimeout(() => {
        setIsCompositingLogo(false);
      }, 500);
    } catch (err) {
      console.error('Erreur intégration logo:', err);
      alert(err.message || 'Impossible d’intégrer le logo.');
      setIsCompositingLogo(false);
    }
  };

  // ─── Finaliser l'onboarding et entrer dans le studio ─────────────
  const finishOnboardingAndEnterStudio = async () => {
    try {
      await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ hasCompletedOnboarding: true }),
      });
    } catch (e) {
      console.warn('Erreur finalisation onboarding:', e);
    }
    router.push('/creer');
  };

  return (
    <div className="onboarding-page">
      {/* ─── Header épinglé (sticky) conforme à la charte ─── */}
      <header className="onboarding-header" role="banner">
        <div className="onboarding-header__content">
          <div className="onboarding-header__left">
            <Link href="/" className="onboarding-header__logo" aria-label="PIXAXIS">
              <LogoPX size={28} withText={true} />
            </Link>
            <span className="onboarding-header__badge">Configuration Marque</span>
          </div>

          <div className="onboarding-header__right">
            {typeof currentStep === 'number' && (
              <span className="onboarding-header__step-indicator">
                Étape {currentStep} sur 4
              </span>
            )}
            <button
              type="button"
              onClick={finishOnboardingAndEnterStudio}
              className="onboarding-header__skip-all-btn"
            >
              Passer directement au Studio →
            </button>
          </div>
        </div>

        {/* Barre de progression discrète en haut */}
        {typeof currentStep === 'number' && (
          <div className="onboarding-progress-bar">
            <div
              className="onboarding-progress-bar__fill"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* ─── Corps Principal ─── */}
      <main className="onboarding-main" role="main">
        {/* ════════════════════════════════════════════════════════════
            ÉTAPE 1 — PREMIER PRODUIT (100% Facultatif)
            ════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="onboarding-card">
            <div className="onboarding-card__header">
              <span className="onboarding-step-tag">Étape 1 · Produit</span>
              <h1 className="onboarding-title">Ajoutez votre premier produit</h1>
              <p className="onboarding-subtitle">
                Vous pourrez aussi le faire plus tard.
              </p>
            </div>

            {productError && (
              <div className="onboarding-error-banner" role="alert">
                ⚠️ {productError}
              </div>
            )}

            {/* Zone de prévisualisation ou d'import */}
            {productPreview ? (
              <div className="onboarding-product-preview-box">
                <div className="onboarding-product-preview-box__img-wrapper">
                  <img
                    src={productPreview}
                    alt="Aperçu de votre produit"
                    className="onboarding-product-preview-box__img"
                  />
                  {isUploadingProduct && (
                    <div className="onboarding-product-preview-box__overlay">
                      <div className="onboarding-spinner" />
                      <span>Optimisation serveur en cours...</span>
                    </div>
                  )}
                </div>
                <div className="onboarding-product-preview-box__actions">
                  <span className="onboarding-product-preview-box__filename">
                    ✓ Produit chargé ({productFile?.name || 'Image'})
                  </span>
                  <button
                    type="button"
                    onClick={removeProductImage}
                    className="onboarding-product-preview-box__remove-btn"
                  >
                    Changer l’image
                  </button>
                </div>
              </div>
            ) : (
              <div className="onboarding-upload-choices">
                {/* Choix 1 : Importer depuis l'appareil */}
                <button
                  type="button"
                  onClick={() => productInputRef.current?.click()}
                  className="onboarding-upload-tile"
                >
                  <div className="onboarding-upload-tile__icon">📁</div>
                  <div className="onboarding-upload-tile__title">Importer une image</div>
                  <div className="onboarding-upload-tile__desc">Depuis votre galerie ou dossier (max 5 MB)</div>
                </button>

                {/* Choix 2 : Prendre une photo */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="onboarding-upload-tile"
                >
                  <div className="onboarding-upload-tile__icon">📷</div>
                  <div className="onboarding-upload-tile__title">Prendre une photo</div>
                  <div className="onboarding-upload-tile__desc">Photographier directement votre produit</div>
                </button>

                {/* Inputs cachés */}
                <input
                  type="file"
                  ref={productInputRef}
                  onChange={(e) => handleProductFile(e.target.files?.[0])}
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  style={{ display: 'none' }}
                />
                <input
                  type="file"
                  ref={cameraInputRef}
                  onChange={(e) => handleProductFile(e.target.files?.[0])}
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {/* Boutons d'action */}
            <div className="onboarding-actions">
              <button
                type="button"
                onClick={goToNextStep}
                className="onboarding-btn-primary"
                disabled={isUploadingProduct}
              >
                <span>Continuer →</span>
              </button>
              <button
                type="button"
                onClick={skipStep}
                className="onboarding-btn-ghost"
              >
                Passer pour l’instant
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ÉTAPE 2 — INFORMATIONS BUSINESS (100% Facultatif)
            ════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="onboarding-card">
            <div className="onboarding-card__header">
              <span className="onboarding-step-tag">Étape 2 · Informations Marque</span>
              <h1 className="onboarding-title">Votre activité</h1>
              <p className="onboarding-subtitle">
                Ces informations permettront à l'IA d'adapter automatiquement chaque publicité à votre commerce. Tous les champs sont facultatifs.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                goToNextStep();
              }}
              className="onboarding-form"
            >
              <div className="onboarding-field">
                <label className="onboarding-label">Votre nom ou prénom</label>
                <input
                  type="text"
                  placeholder="Ex: Aïcha, Moussa, Sarah..."
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="onboarding-input"
                />
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Numéro de téléphone / WhatsApp</label>
                <input
                  type="tel"
                  placeholder="Ex: +225 07 00 00 00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="onboarding-input"
                />
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Nom du business / Marque</label>
                <input
                  type="text"
                  placeholder="Ex: Élégance Wax, Café Lumina, TechStore..."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="onboarding-input"
                />
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">Adresse ou Ville</label>
                <input
                  type="text"
                  placeholder="Ex: Abidjan, Cocody / Dakar, Plateau..."
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="onboarding-input"
                />
              </div>

              <div className="onboarding-field">
                <label className="onboarding-label">
                  Argument marketing / Description de l’activité
                </label>
                <textarea
                  placeholder="Ex: Mode féminine chic et moderne, confection artisanale, livraison express 24h."
                  value={marketingPitch}
                  onChange={(e) => setMarketingPitch(e.target.value)}
                  rows={3}
                  className="onboarding-textarea"
                />
              </div>

              {/* Boutons d'action */}
              <div className="onboarding-actions">
                <button type="submit" className="onboarding-btn-primary">
                  <span>Continuer →</span>
                </button>
                <button
                  type="button"
                  onClick={skipStep}
                  className="onboarding-btn-ghost"
                >
                  Passer pour l’instant
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ÉTAPE 3 — FORMAT (100% Facultatif)
            ════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="onboarding-card">
            <div className="onboarding-card__header">
              <span className="onboarding-step-tag">Étape 3 · Format</span>
              <h1 className="onboarding-title">Format privilégié</h1>
              <p className="onboarding-subtitle">
                Choisissez le format le plus fréquent pour vos publicités. Vous pourrez toujours le modifier lors de chaque génération.
              </p>
            </div>

            <div className="onboarding-formats-grid">
              {FORMATS.map((fmt) => {
                const isSelected = selectedFormat === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.id)}
                    className={`onboarding-format-card ${isSelected ? 'onboarding-format-card--active' : ''}`}
                  >
                    <div className="onboarding-format-card__ratio-box">
                      <div
                        className="onboarding-format-card__silhouette"
                        style={{
                          aspectRatio: fmt.ratio.replace(':', '/'),
                        }}
                      />
                    </div>
                    <div className="onboarding-format-card__info">
                      <div className="onboarding-format-card__title">
                        {fmt.label} {isSelected && <span className="onboarding-checkmark">✓</span>}
                      </div>
                      <div className="onboarding-format-card__desc">{fmt.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Boutons d'action */}
            <div className="onboarding-actions">
              <button
                type="button"
                onClick={goToNextStep}
                className="onboarding-btn-primary"
              >
                <span>Continuer →</span>
              </button>
              <button
                type="button"
                onClick={skipStep}
                className="onboarding-btn-ghost"
              >
                Passer pour l’instant
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ÉTAPE 4 — PREMIÈRE DEMANDE (100% Facultatif)
            ════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="onboarding-card">
            <div className="onboarding-card__header">
              <span className="onboarding-step-tag">Étape 4 · Demande Créative</span>
              <h1 className="onboarding-title">Que voulez-vous créer ?</h1>
              <p className="onboarding-subtitle">
                Donnez une directive simple à l'IA ou laissez-la concevoir un visuel publicitaire percutant selon vos choix précédents.
              </p>
            </div>

            <div className="onboarding-chat-box">
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="Ex: Mets cette robe sur une enfant de 5 ans dans une belle publicité lumineuse et festive."
                rows={4}
                className="onboarding-chat-textarea"
                maxLength={150}
              />

              <div className="onboarding-chat-chips">
                <span className="onboarding-chips-title">Idées rapides :</span>
                {[
                  'Mise en scène élégante sur piédestal moderne',
                  'Ambiance lumineuse festive et chaleureuse',
                  'Publicité premium avec reflets et éclairage studio',
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setUserPrompt(chip)}
                    className="onboarding-chip-btn"
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Récapitulatif discret des informations réunies */}
            <div className="onboarding-summary-bar">
              <div className="onboarding-summary-item">
                <span>Produit :</span>{' '}
                <strong>{productFile ? '✓ Image prête' : 'Standard pro'}</strong>
              </div>
              <div className="onboarding-summary-item">
                <span>Marque :</span>{' '}
                <strong>{businessName || 'Profil actif'}</strong>
              </div>
              <div className="onboarding-summary-item">
                <span>Format :</span>{' '}
                <strong>
                  {selectedFormat === '1024x1792'
                    ? 'Vertical (9:16)'
                    : selectedFormat === '1792x1024'
                    ? 'Paysage (16:9)'
                    : 'Carré (1:1)'}
                </strong>
              </div>
            </div>

            {/* Bouton Final */}
            <div className="onboarding-actions" style={{ flexDirection: 'column', gap: '0.85rem' }}>
              <button
                type="button"
                onClick={handleFinalGenerate}
                className="onboarding-final-btn"
              >
                <span>✨ Générer mon premier visuel pro</span>
              </button>
              <button
                type="button"
                onClick={finishOnboardingAndEnterStudio}
                className="onboarding-btn-ghost"
              >
                Passer directement au Studio sans générer
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ÉCRAN DE GÉNÉRATION — CARTE 3D ANIMÉE (Aucun faux chronomètre)
            ════════════════════════════════════════════════════════════ */}
        {(currentStep === 'generating' || isCompositingLogo) && (
          <div className="onboarding-3d-generation-stage">
            <div className="onboarding-3d-scene">
              {/* Carte 3D animée au centre avec halo cyan électrique et rotation subtile */}
              <div className="onboarding-3d-card">
                {/* Lueurs et faisceaux cyan en orbite */}
                <div className="onboarding-3d-glow-orb onboarding-3d-glow-orb--1" />
                <div className="onboarding-3d-glow-orb onboarding-3d-glow-orb--2" />

                <div className="onboarding-3d-card__inner">
                  <div className="onboarding-3d-card__brand">
                    <LogoPX size={42} withText={false} />
                  </div>

                  {productPreview && (
                    <div className="onboarding-3d-card__preview-thumb">
                      <img src={productPreview} alt="Produit" />
                    </div>
                  )}

                  <div className="onboarding-3d-card__pulse-ring" />

                  <div className="onboarding-3d-card__status-text">
                    {generationPhase}
                  </div>

                  <div className="onboarding-3d-card__subtext">
                    Traitement haute définition en cours...
                  </div>
                </div>
              </div>
            </div>

            {generationError && (
              <div className="onboarding-gen-error-modal">
                <div className="onboarding-gen-error-box">
                  <h3>⚠️ Impossible de générer</h3>
                  <p>{generationError}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="onboarding-btn-primary"
                    >
                      Réessayer
                    </button>
                    <button
                      type="button"
                      onClick={finishOnboardingAndEnterStudio}
                      className="onboarding-btn-ghost"
                    >
                      Accéder au studio
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            ÉCRAN DE RÉSULTAT POST-GÉNÉRATION
            ════════════════════════════════════════════════════════════ */}
        {currentStep === 'result' && generatedImage && (
          <div className="onboarding-result-container">
            <div className="onboarding-result-card">
              <div className="onboarding-result-card__header">
                <span className="onboarding-result-badge">✓ Premier Visuel Réussi</span>
                <h1 className="onboarding-title">Voici votre création publicitaire</h1>
              </div>

              {/* Image générée */}
              <div className="onboarding-result-visual">
                <img
                  src={generatedImage.url}
                  alt="Visuel publicitaire généré"
                  className="onboarding-result-img"
                />
              </div>

              {/* Système de notation discrète ★★★★★ (facultatif et non bloquant) */}
              <div className="onboarding-rating-bar">
                <span className="onboarding-rating-label">Votre avis sur ce résultat :</span>
                <div className="onboarding-stars-row">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => handleRate(star)}
                      className="onboarding-star-btn"
                      aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                    >
                      {star <= (hoverRating || rating) ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                {ratingSubmitted && (
                  <span className="onboarding-rating-thanks">Merci pour votre note !</span>
                )}
              </div>

              {/* Boutons d'actions après génération */}
              <div className="onboarding-result-actions">
                <button
                  type="button"
                  onClick={() => downloadImage(generatedImage.url, 'pixaxis-visuel.png')}
                  className="onboarding-btn-download"
                >
                  <span>📥 Télécharger l’image</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(true)}
                  className="onboarding-btn-logo"
                >
                  <span>🏷️ Ajouter mon logo</span>
                </button>
              </div>

              {/* Bouton de progression finale vers le Studio */}
              <div className="onboarding-enter-studio-box">
                <button
                  type="button"
                  onClick={finishOnboardingAndEnterStudio}
                  className="onboarding-enter-studio-btn"
                >
                  <span>Accéder à l'application principale (Studio PIXAXIS) →</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            MODAL D'AJOUT DU LOGO
            ════════════════════════════════════════════════════════════ */}
        {isLogoModalOpen && (
          <div className="onboarding-modal-backdrop" onClick={() => setIsLogoModalOpen(false)}>
            <div
              className="onboarding-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="onboarding-modal-header">
                <h2>Intégrer votre logo</h2>
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="onboarding-modal-close"
                >
                  ✕
                </button>
              </div>

              <p className="onboarding-modal-desc">
                Votre logo sera superposé avec netteté chirurgicale sur votre visuel (préservation vectorielle pure, aucune réinterprétation par l'IA).
              </p>

              {logoError && (
                <div className="onboarding-error-banner">⚠️ {logoError}</div>
              )}

              {logoPreview ? (
                <div className="onboarding-logo-preview-box">
                  <img src={logoPreview} alt="Aperçu Logo" className="onboarding-logo-preview-img" />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                    }}
                    className="onboarding-logo-change-btn"
                  >
                    Changer de fichier
                  </button>
                </div>
              ) : (
                <div
                  className="onboarding-logo-dropzone"
                  onClick={() => logoInputRef.current?.click()}
                >
                  <div className="onboarding-logo-dropzone__icon">🏷️</div>
                  <div className="onboarding-logo-dropzone__text">
                    Cliquez pour choisir votre logo (PNG avec transparence recommandé, max 5 MB)
                  </div>
                </div>
              )}

              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoFileSelect}
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                style={{ display: 'none' }}
              />

              <div className="onboarding-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsLogoModalOpen(false)}
                  className="onboarding-btn-ghost"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!logoFile}
                  onClick={handleSendLogo}
                  className="onboarding-btn-primary"
                >
                  <span>Envoyer</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ─── Styles CSS Scellés pour l'Onboarding & Carte 3D ─── */}
      <style jsx global>{`
        .onboarding-page {
          min-height: 100vh;
          background-color: #000000;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* Header Sticky */
        .onboarding-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background-color: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
        }

        .onboarding-header__content {
          max-width: 1000px;
          margin: 0 auto;
          padding: 0.85rem 1.25rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .onboarding-header__left {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .onboarding-header__logo {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .onboarding-header__badge {
          background-color: rgba(0, 229, 255, 0.1);
          border: 1px solid rgba(0, 229, 255, 0.3);
          color: #00e5ff;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .onboarding-header__right {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .onboarding-header__step-indicator {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.65);
          font-weight: 500;
        }

        .onboarding-header__skip-all-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.45);
          font-size: 0.82rem;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 4px 6px;
        }

        .onboarding-header__skip-all-btn:hover {
          color: #00e5ff;
        }

        .onboarding-progress-bar {
          width: 100%;
          height: 2px;
          background: rgba(255, 255, 255, 0.05);
        }

        .onboarding-progress-bar__fill {
          height: 100%;
          background: linear-gradient(90deg, #00b4d8, #00e5ff);
          transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.6);
        }

        /* Conteneur principal */
        .onboarding-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1.25rem;
          max-width: 720px;
          width: 100%;
          margin: 0 auto;
        }

        /* Carte d'étape */
        .onboarding-card {
          width: 100%;
          background: #080808;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
          animation: onboardingFadeIn 0.35s ease-out;
        }

        @keyframes onboardingFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .onboarding-step-tag {
          display: inline-block;
          color: #00e5ff;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        .onboarding-title {
          font-size: 1.85rem;
          font-weight: 700;
          color: #ffffff;
          line-height: 1.25;
          margin: 0 0 0.5rem 0;
        }

        .onboarding-subtitle {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.5;
          margin: 0;
        }

        .onboarding-error-banner {
          background: rgba(255, 68, 68, 0.12);
          border: 1px solid rgba(255, 68, 68, 0.4);
          color: #ff6b6b;
          font-size: 0.85rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          line-height: 1.4;
        }

        /* Choix d'upload (Étape 1) */
        .onboarding-upload-choices {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 540px) {
          .onboarding-upload-choices {
            grid-template-columns: 1fr;
          }
        }

        .onboarding-upload-tile {
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 14px;
          padding: 2rem 1.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.6rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          color: #ffffff;
        }

        .onboarding-upload-tile:hover {
          border-color: #00e5ff;
          background: #141414;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0, 229, 255, 0.15);
        }

        .onboarding-upload-tile__icon {
          font-size: 2.2rem;
        }

        .onboarding-upload-tile__title {
          font-size: 1rem;
          font-weight: 600;
        }

        .onboarding-upload-tile__desc {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.4;
        }

        .onboarding-product-preview-box {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: #111111;
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 14px;
          padding: 1.25rem;
        }

        .onboarding-product-preview-box__img-wrapper {
          position: relative;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000000;
          border-radius: 10px;
          overflow: hidden;
        }

        .onboarding-product-preview-box__img {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }

        .onboarding-product-preview-box__overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: #00e5ff;
        }

        .onboarding-product-preview-box__actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 0.25rem;
        }

        .onboarding-product-preview-box__filename {
          font-size: 0.82rem;
          color: #00e5ff;
          font-weight: 500;
        }

        .onboarding-product-preview-box__remove-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.8rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .onboarding-product-preview-box__remove-btn:hover {
          color: #ff6b6b;
        }

        /* Formulaire (Étape 2) */
        .onboarding-form {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .onboarding-field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .onboarding-label {
          font-size: 0.85rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.85);
        }

        .onboarding-input,
        .onboarding-textarea {
          width: 100%;
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.92rem;
          color: #ffffff;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
          font-family: inherit;
        }

        .onboarding-input:focus,
        .onboarding-textarea:focus {
          border-color: #00e5ff;
          box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.2);
        }

        /* Formats (Étape 3) */
        .onboarding-formats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }

        @media (max-width: 580px) {
          .onboarding-formats-grid {
            grid-template-columns: 1fr;
          }
        }

        .onboarding-format-card {
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          cursor: pointer;
          transition: all 0.25s ease;
          color: #ffffff;
          text-align: center;
        }

        .onboarding-format-card:hover {
          border-color: rgba(0, 229, 255, 0.5);
          background: #141414;
        }

        .onboarding-format-card--active {
          border-color: #00e5ff !important;
          background: rgba(0, 229, 255, 0.06) !important;
          box-shadow: 0 0 24px rgba(0, 229, 255, 0.2);
        }

        .onboarding-format-card__ratio-box {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onboarding-format-card__silhouette {
          background: rgba(255, 255, 255, 0.15);
          border: 1.5px solid rgba(255, 255, 255, 0.4);
          border-radius: 4px;
          max-width: 64px;
          max-height: 64px;
          transition: all 0.2s ease;
        }

        .onboarding-format-card--active .onboarding-format-card__silhouette {
          background: rgba(0, 229, 255, 0.25);
          border-color: #00e5ff;
        }

        .onboarding-format-card__title {
          font-size: 0.95rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .onboarding-checkmark {
          color: #00e5ff;
          font-weight: 800;
        }

        .onboarding-format-card__desc {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
          line-height: 1.3;
        }

        /* Chat (Étape 4) */
        .onboarding-chat-box {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .onboarding-chat-textarea {
          width: 100%;
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 1rem;
          font-size: 0.95rem;
          color: #ffffff;
          outline: none;
          box-sizing: border-box;
          font-family: inherit;
          resize: vertical;
          line-height: 1.5;
        }

        .onboarding-chat-textarea:focus {
          border-color: #00e5ff;
          box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.2);
        }

        .onboarding-chat-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }

        .onboarding-chips-title {
          font-size: 0.76rem;
          color: rgba(255, 255, 255, 0.45);
        }

        .onboarding-chip-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 20px;
          padding: 4px 10px;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.75);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .onboarding-chip-btn:hover {
          background: rgba(0, 229, 255, 0.12);
          border-color: #00e5ff;
          color: #00e5ff;
        }

        .onboarding-summary-bar {
          background: #111111;
          border-radius: 10px;
          padding: 0.85rem 1rem;
          display: flex;
          justify-content: space-around;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .onboarding-summary-item strong {
          color: #00e5ff;
          font-weight: 600;
        }

        /* Boutons globaux */
        .onboarding-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 0.5rem;
        }

        .onboarding-btn-primary {
          flex: 1;
          background: linear-gradient(135deg, #00e5ff, #00b4d8);
          color: #000000;
          font-size: 0.95rem;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          padding: 0.85rem 1.5rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onboarding-btn-primary:hover:not(:disabled) {
          box-shadow: 0 0 25px rgba(0, 229, 255, 0.5);
          transform: translateY(-1px);
        }

        .onboarding-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .onboarding-final-btn {
          width: 100%;
          background: linear-gradient(135deg, #00e5ff 0%, #00b4d8 60%, #0077b6 100%);
          color: #000000;
          font-size: 1.05rem;
          font-weight: 800;
          border: none;
          border-radius: 14px;
          padding: 1.1rem 1.75rem;
          cursor: pointer;
          box-shadow: 0 0 35px rgba(0, 229, 255, 0.45);
          transition: all 0.3s ease;
          letter-spacing: 0.02em;
        }

        .onboarding-final-btn:hover {
          box-shadow: 0 0 50px rgba(0, 229, 255, 0.7);
          transform: translateY(-2px);
        }

        .onboarding-btn-ghost {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9rem;
          border-radius: 12px;
          padding: 0.85rem 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .onboarding-btn-ghost:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.04);
        }

        /* ════════════════════════════════════════════════════════════
            CARTE 3D ANIMÉE — GÉNÉRATION (Strict CSS 3D & Electric Cyan)
            ════════════════════════════════════════════════════════════ */
        .onboarding-3d-generation-stage {
          width: 100%;
          min-height: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .onboarding-3d-scene {
          perspective: 1200px;
          width: 320px;
          height: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onboarding-3d-card {
          width: 280px;
          height: 380px;
          position: relative;
          transform-style: preserve-3d;
          animation: card3DFloat 6s ease-in-out infinite alternate;
          border-radius: 24px;
        }

        @keyframes card3DFloat {
          0% {
            transform: rotateY(-14deg) rotateX(10deg) translateY(-8px);
          }
          50% {
            transform: rotateY(0deg) rotateX(-6deg) translateY(6px);
          }
          100% {
            transform: rotateY(16deg) rotateX(8deg) translateY(-8px);
          }
        }

        /* Halo et orbes cyan en mouvement doux */
        .onboarding-3d-glow-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(40px);
          pointer-events: none;
          z-index: 1;
        }

        .onboarding-3d-glow-orb--1 {
          width: 180px;
          height: 180px;
          background: radial-gradient(circle, rgba(0, 229, 255, 0.6) 0%, rgba(0, 229, 255, 0) 70%);
          top: -30px;
          left: -30px;
          animation: orbOrbit1 7s ease-in-out infinite alternate;
        }

        .onboarding-3d-glow-orb--2 {
          width: 220px;
          height: 220px;
          background: radial-gradient(circle, rgba(0, 180, 216, 0.5) 0%, rgba(0, 180, 216, 0) 70%);
          bottom: -40px;
          right: -40px;
          animation: orbOrbit2 8s ease-in-out infinite alternate;
        }

        @keyframes orbOrbit1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 30px) scale(1.15); }
          100% { transform: translate(20px, -20px) scale(0.9); }
        }

        @keyframes orbOrbit2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -40px) scale(1.1); }
          100% { transform: translate(30px, 20px) scale(0.95); }
        }

        .onboarding-3d-card__inner {
          position: relative;
          z-index: 2;
          width: 100%;
          height: 100%;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1.5px solid rgba(0, 229, 255, 0.4);
          border-radius: 24px;
          box-shadow: 
            0 25px 60px rgba(0, 0, 0, 0.8),
            0 0 35px rgba(0, 229, 255, 0.25),
            inset 0 0 25px rgba(0, 229, 255, 0.08);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          text-align: center;
          gap: 1.25rem;
          box-sizing: border-box;
          transform: translateZ(20px);
        }

        .onboarding-3d-card__brand {
          filter: drop-shadow(0 0 16px rgba(0, 229, 255, 0.8));
          animation: brandPulse 2.5s ease-in-out infinite;
        }

        @keyframes brandPulse {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 14px rgba(0, 229, 255, 0.6)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 0 26px rgba(0, 229, 255, 0.95)); }
        }

        .onboarding-3d-card__preview-thumb {
          width: 60px;
          height: 60px;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid rgba(0, 229, 255, 0.5);
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.3);
        }

        .onboarding-3d-card__preview-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .onboarding-3d-card__pulse-ring {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: 2px solid #00e5ff;
          border-top-color: transparent;
          animation: ringSpin 1.2s linear infinite;
          box-shadow: 0 0 15px rgba(0, 229, 255, 0.5);
        }

        @keyframes ringSpin {
          to { transform: rotate(360deg); }
        }

        .onboarding-3d-card__status-text {
          font-size: 0.92rem;
          font-weight: 600;
          color: #ffffff;
          line-height: 1.4;
        }

        .onboarding-3d-card__subtext {
          font-size: 0.74rem;
          color: rgba(0, 229, 255, 0.8);
          letter-spacing: 0.02em;
        }

        /* ════════════════════════════════════════════════════════════
            RÉSULTAT
            ════════════════════════════════════════════════════════════ */
        .onboarding-result-container {
          width: 100%;
          display: flex;
          justify-content: center;
          animation: resultReveal 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes resultReveal {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(14px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .onboarding-result-card {
          width: 100%;
          background: #080808;
          border: 1px solid rgba(0, 229, 255, 0.25);
          border-radius: 20px;
          padding: 2.25rem;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 229, 255, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .onboarding-result-card__header {
          text-align: center;
        }

        .onboarding-result-badge {
          display: inline-block;
          color: #00e5ff;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          margin-bottom: 0.4rem;
        }

        .onboarding-result-visual {
          width: 100%;
          max-width: 480px;
          border-radius: 16px;
          overflow: hidden;
          background: #000000;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
        }

        .onboarding-result-img {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
        }

        /* Bar de notation */
        .onboarding-rating-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 30px;
          padding: 0.5rem 1.25rem;
        }

        .onboarding-rating-label {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .onboarding-stars-row {
          display: flex;
          gap: 4px;
        }

        .onboarding-star-btn {
          background: transparent;
          border: none;
          color: #ffb703;
          font-size: 1.3rem;
          cursor: pointer;
          line-height: 1;
          padding: 0 2px;
          transition: transform 0.15s ease;
        }

        .onboarding-star-btn:hover {
          transform: scale(1.25);
        }

        .onboarding-rating-thanks {
          font-size: 0.78rem;
          color: #00e5ff;
          font-weight: 500;
        }

        /* Actions post-génération */
        .onboarding-result-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          width: 100%;
          max-width: 480px;
        }

        @media (max-width: 460px) {
          .onboarding-result-actions {
            grid-template-columns: 1fr;
          }
        }

        .onboarding-btn-download {
          background: #111111;
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #ffffff;
          font-size: 0.92rem;
          font-weight: 600;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onboarding-btn-download:hover {
          border-color: #ffffff;
          background: #161616;
          transform: translateY(-1px);
        }

        .onboarding-btn-logo {
          background: rgba(0, 229, 255, 0.1);
          border: 1px solid rgba(0, 229, 255, 0.4);
          color: #00e5ff;
          font-size: 0.92rem;
          font-weight: 600;
          border-radius: 12px;
          padding: 0.85rem 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .onboarding-btn-logo:hover {
          background: rgba(0, 229, 255, 0.2);
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.25);
          transform: translateY(-1px);
        }

        .onboarding-enter-studio-box {
          width: 100%;
          max-width: 480px;
          margin-top: 0.5rem;
        }

        .onboarding-enter-studio-btn {
          width: 100%;
          background: linear-gradient(135deg, #00e5ff, #00b4d8);
          color: #000000;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          border-radius: 12px;
          padding: 0.95rem 1.5rem;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 0 25px rgba(0, 229, 255, 0.35);
        }

        .onboarding-enter-studio-btn:hover {
          box-shadow: 0 0 40px rgba(0, 229, 255, 0.6);
          transform: translateY(-1px);
        }

        /* ════════════════════════════════════════════════════════════
            MODAL LOGO
            ════════════════════════════════════════════════════════════ */
        .onboarding-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          z-index: 200;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .onboarding-modal-card {
          width: 100%;
          max-width: 460px;
          background: #0d0d0d;
          border: 1px solid rgba(0, 229, 255, 0.3);
          border-radius: 20px;
          padding: 2rem;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 229, 255, 0.2);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .onboarding-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .onboarding-modal-header h2 {
          font-size: 1.3rem;
          font-weight: 700;
          margin: 0;
          color: #ffffff;
        }

        .onboarding-modal-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          font-size: 1.2rem;
          cursor: pointer;
        }

        .onboarding-modal-close:hover {
          color: #ffffff;
        }

        .onboarding-modal-desc {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.65);
          line-height: 1.45;
          margin: 0;
        }

        .onboarding-logo-dropzone {
          border: 2px dashed rgba(0, 229, 255, 0.3);
          border-radius: 14px;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.75rem;
          cursor: pointer;
          background: rgba(0, 229, 255, 0.03);
          transition: all 0.2s ease;
        }

        .onboarding-logo-dropzone:hover {
          border-color: #00e5ff;
          background: rgba(0, 229, 255, 0.08);
        }

        .onboarding-logo-dropzone__icon {
          font-size: 2.5rem;
        }

        .onboarding-logo-dropzone__text {
          font-size: 0.82rem;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.4;
        }

        .onboarding-logo-preview-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          background: #000000;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .onboarding-logo-preview-img {
          max-height: 90px;
          max-width: 100%;
          object-fit: contain;
        }

        .onboarding-logo-change-btn {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.78rem;
          text-decoration: underline;
          cursor: pointer;
        }

        .onboarding-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .onboarding-spinner {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 2px solid rgba(0, 229, 255, 0.2);
          border-top-color: #00e5ff;
          animation: ringSpin 0.9s linear infinite;
        }

        .onboarding-gen-error-modal {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          z-index: 250;
        }

        .onboarding-gen-error-box {
          background: #111111;
          border: 1px solid #ff4444;
          border-radius: 16px;
          padding: 1.75rem;
          max-width: 420px;
          text-align: center;
          color: #ffffff;
        }

        .onboarding-gen-error-box h3 {
          margin: 0 0 0.75rem 0;
          color: #ff6b6b;
        }

        .onboarding-gen-error-box p {
          font-size: 0.88rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.45;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
