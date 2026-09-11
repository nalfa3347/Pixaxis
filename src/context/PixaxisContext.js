'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const PixaxisContext = createContext(null);

/**
 * PixaxisProvider — Gestionnaire d'état et cache en mémoire de session.
 * 
 * Objectifs clés :
 * 1. Navigation instantanée entre les pages (0ms de latence, aucun écran de chargement sur page déjà vue).
 * 2. Cache intelligent et réactif : mise à jour immédiate dès qu'une image est importée ou générée.
 * 3. Revalidation discrète en arrière-plan (SWR) pour toujours refléter les données réelles de Supabase.
 */
export function PixaxisProvider({ children }) {
  // Cache des images
  const [createdImages, setCreatedImages] = useState(null);
  const [importedImages, setImportedImages] = useState(null);
  const [isLoadingCreated, setIsLoadingCreated] = useState(false);
  const [isLoadingImported, setIsLoadingImported] = useState(false);

  // Cache des crédits et lots FEFO
  const [creditsData, setCreditsData] = useState(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Cache de la file d'attente glissante
  const [queueData, setQueueData] = useState({ active_count: 0, max_limit: 10, available_slots: 10, can_queue: true });

  // Timestamp des derniers rafraîchissements
  const lastFetchedRef = useRef({ created: 0, imported: 0, credits: 0 });

  // ─── Récupération des images (avec cache en mémoire) ───
  const fetchImages = useCallback(async (tab, force = false) => {
    const isCreated = tab === 'created';
    const currentData = isCreated ? createdImages : importedImages;
    const now = Date.now();
    const lastTime = lastFetchedRef.current[tab] || 0;

    // Si des données sont déjà en mémoire et que le cache est récent (< 2min) et pas de force, pas d'appel réseau bloquant
    if (currentData !== null && !force && now - lastTime < 120000) {
      return currentData;
    }

    // N'afficher le loader que s'il n'y a STRICTEMENT AUCUNE donnée en cache
    const shouldShowSpinner = currentData === null;
    if (shouldShowSpinner) {
      if (isCreated) setIsLoadingCreated(true);
      else setIsLoadingImported(true);
    }

    try {
      const res = await fetch(`/api/images?tab=${tab}`);
      if (res.ok) {
        const data = await res.json();
        const images = data.images || [];
        if (isCreated) setCreatedImages(images);
        else setImportedImages(images);
        lastFetchedRef.current[tab] = Date.now();
        return images;
      }
    } catch (err) {
      console.warn(`Erreur récupération images (${tab}):`, err);
    } finally {
      if (isCreated) setIsLoadingCreated(false);
      else setIsLoadingImported(false);
    }
    return currentData || [];
  }, [createdImages, importedImages]);

  // ─── Récupération des crédits (avec cache en mémoire) ───
  const fetchCredits = useCallback(async (force = false) => {
    const now = Date.now();
    if (creditsData !== null && !force && now - lastFetchedRef.current.credits < 30000) {
      return creditsData;
    }

    const shouldShowSpinner = creditsData === null;
    if (shouldShowSpinner) setIsLoadingCredits(true);

    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        setCreditsData(data);
        lastFetchedRef.current.credits = Date.now();
        return data;
      }
    } catch (err) {
      console.warn('Erreur chargement crédits:', err);
    } finally {
      setIsLoadingCredits(false);
    }
    return creditsData;
  }, [creditsData]);

  // ─── Récupération de la file glissante ───
  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/queue');
      if (res.ok) {
        const data = await res.json();
        setQueueData(data);
        return data;
      }
    } catch (err) {
      console.warn('Erreur chargement file:', err);
    }
    return queueData;
  }, [queueData]);

  // ─── Action : Ajouter des images importées dans le cache ───
  const addImportedImages = useCallback((newImages) => {
    if (!newImages || newImages.length === 0) return;
    setImportedImages((prev) => {
      const existing = prev || [];
      // Éviter les doublons par ID ou URL
      const added = newImages.filter((ni) => !existing.some((e) => (e.id && e.id === ni.id) || e.url === ni.url));
      return [...added, ...existing];
    });
  }, []);

  // ─── Action : Ajouter une image générée dans le cache ───
  const addCreatedImage = useCallback((newImage, creditsDeducted = 0) => {
    if (!newImage) return;
    setCreatedImages((prev) => [newImage, ...(prev || [])]);

    // Déduction immédiate dans le cache crédits
    if (creditsDeducted > 0) {
      setCreditsData((prev) => {
        if (!prev) return prev;
        const newTotal = Math.max(0, (prev.total_credits || 0) - creditsDeducted);
        return {
          ...prev,
          total_credits: newTotal,
          fefo_lot: prev.fefo_lot
            ? { ...prev.fefo_lot, credits_restants: Math.max(0, prev.fefo_lot.credits_restants - creditsDeducted) }
            : null,
        };
      });
    }
  }, []);

  // ─── Action : Supprimer définitivement une image importée (API + Cache) ───
  const deleteImportedImage = useCallback(async (id, url) => {
    if (!id && !url) return false;
    try {
      const res = await fetch(`/api/images?id=${encodeURIComponent(id || '')}&url=${encodeURIComponent(url || '')}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Échec de la suppression');
      }

      // Retrait immédiat du cache en mémoire
      setImportedImages((prev) => (prev || []).filter((img) => (id ? img.id !== id : img.url !== url)));
      return true;
    } catch (err) {
      console.error('Erreur deleteImportedImage:', err);
      throw err;
    }
  }, []);

  // Pré-chargement silencieux au lancement — seulement sur les pages de l'app
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const isAppPage = ['/mes-images', '/creer', '/profil'].some(p => path.startsWith(p));
    if (!isAppPage) return;

    // Crédits et file d'attente sont prioritaires (légers)
    fetchCredits();
    fetchQueue();
    // Images en léger différé pour ne pas saturer la connexion
    const t = setTimeout(() => {
      fetchImages('created');
      fetchImages('imported');
    }, 100);
    return () => clearTimeout(t);
  }, []);

  const value = {
    createdImages,
    importedImages,
    isLoadingCreated,
    isLoadingImported,
    creditsData,
    isLoadingCredits,
    queueData,
    fetchImages,
    fetchCredits,
    fetchQueue,
    addImportedImages,
    addCreatedImage,
    deleteImportedImage,
    setCreditsData,
    setQueueData,
  };

  return (
    <PixaxisContext.Provider value={value}>
      {children}
    </PixaxisContext.Provider>
  );
}

export function usePixaxis() {
  const context = useContext(PixaxisContext);
  if (!context) {
    throw new Error('usePixaxis doit être utilisé au sein de PixaxisProvider');
  }
  return context;
}
