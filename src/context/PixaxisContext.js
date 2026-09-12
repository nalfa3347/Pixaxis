'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase-client';

const PixaxisContext = createContext(null);

/**
 * PixaxisProvider — Gestionnaire d'état, authentification et cache de session.
 * 
 * Objectifs clés :
 * 1. Synchronisation multi-appareils automatique (Supabase Auth).
 * 2. Navigation instantanée entre les pages (0ms de latence).
 * 3. Isolation stricte des données par utilisateur.
 */
export function PixaxisProvider({ children }) {
  // Session utilisateur
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [authInitialized, setAuthInitialized] = useState(false);

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

  // Profil de marque et onboarding
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Timestamp des derniers rafraîchissements
  const lastFetchedRef = useRef({ created: 0, imported: 0, credits: 0, profile: 0 });

  // ─── Écoute et vérification de l'authentification Supabase ───
  useEffect(() => {
    // Vérification auprès de Supabase pour purger toute session orpheline ou utilisateur supprimé
    supabase.auth.getUser().then(({ data: { user: verifiedUser }, error }) => {
      if (error || !verifiedUser) {
        // Nettoyage immédiat des jetons locaux périmés
        supabase.auth.signOut().catch(() => {});
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pixaxis_user_id');
          localStorage.removeItem('pixaxis_user_name');
          localStorage.removeItem('pixaxis_user_phone');
        }
        setSession(null);
        setUser(null);
      } else {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          setSession(currentSession);
          setUser(verifiedUser);
        });
      }
      setAuthInitialized(true);
    }).catch(() => {
      setAuthInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      // Réinitialiser le cache quand l'utilisateur change
      lastFetchedRef.current = { created: 0, imported: 0, credits: 0, profile: 0 };
      setCreatedImages(null);
      setImportedImages(null);
      setCreditsData(null);
      setUserProfile(null);
      setAuthInitialized(true);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // En-têtes d'authentification pour les requêtes API
  const getAuthHeaders = useCallback(() => {
    const headers = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    if (session?.user?.id) {
      headers['x-user-id'] = session.user.id;
    }
    return headers;
  }, [session]);

  // ─── Récupération des images (avec cache en mémoire) ───
  const fetchImages = useCallback(async (tab, force = false) => {
    const isCreated = tab === 'created';
    const currentData = isCreated ? createdImages : importedImages;
    const now = Date.now();
    const lastTime = lastFetchedRef.current[tab] || 0;

    // Si des données sont déjà en mémoire et que le cache est récent (< 2min) et pas de force
    if (currentData !== null && !force && now - lastTime < 120000) {
      return currentData;
    }

    const shouldShowSpinner = currentData === null;
    if (shouldShowSpinner) {
      if (isCreated) setIsLoadingCreated(true);
      else setIsLoadingImported(true);
    }

    try {
      const res = await fetch(`/api/images?tab=${tab}`, {
        headers: getAuthHeaders(),
      });
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
  }, [createdImages, importedImages, getAuthHeaders]);

  // ─── Récupération des crédits (avec cache en mémoire) ───
  const fetchCredits = useCallback(async (force = false) => {
    const now = Date.now();
    if (creditsData !== null && !force && now - lastFetchedRef.current.credits < 30000) {
      return creditsData;
    }

    const shouldShowSpinner = creditsData === null;
    if (shouldShowSpinner) setIsLoadingCredits(true);

    try {
      const res = await fetch(`/api/credits${force ? '?force=true' : ''}`, {
        headers: getAuthHeaders(),
      });
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
  }, [creditsData, getAuthHeaders]);

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
        headers: getAuthHeaders(),
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
  }, [getAuthHeaders]);

  // ─── Déconnexion propre ───
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pixaxis_user_id');
      localStorage.removeItem('pixaxis_user_name');
      localStorage.removeItem('pixaxis_user_phone');
    }
    setSession(null);
    setUser(null);
    setCreatedImages([]);
    setImportedImages([]);
    setCreditsData(null);
    setUserProfile(null);
  }, []);

  // ─── Récupération du profil utilisateur ───
  const fetchUserProfile = useCallback(async (force = false) => {
    if (!user?.id) return null;
    const now = Date.now();
    if (userProfile !== null && !force && now - (lastFetchedRef.current.profile || 0) < 60000) {
      return userProfile;
    }

    setIsLoadingProfile(true);
    try {
      const res = await fetch('/api/onboarding/profile', {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile || null);
        lastFetchedRef.current.profile = Date.now();
        return data.profile;
      }
    } catch (err) {
      console.warn('Erreur récupération profil utilisateur:', err);
    } finally {
      setIsLoadingProfile(false);
    }
    return userProfile;
  }, [user, userProfile, getAuthHeaders]);

  // ─── Mise à jour du profil utilisateur ───
  const updateUserProfile = useCallback(async (updates) => {
    try {
      const res = await fetch('/api/onboarding/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(data.profile);
        return data.profile;
      }
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
    }
    return null;
  }, [getAuthHeaders]);

  // Pré-chargement silencieux au lancement — seulement sur les pages de l'app
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const path = window.location.pathname;
    const isAppPage = ['/mes-images', '/creer', '/profil', '/onboarding'].some(p => path.startsWith(p));
    if (!isAppPage) return;

    // Crédits et file d'attente sont prioritaires (légers)
    fetchCredits();
    fetchQueue();
    fetchUserProfile();
    // Images en léger différé pour ne pas saturer la connexion
    const t = setTimeout(() => {
      fetchImages('created');
      fetchImages('imported');
    }, 100);
    return () => clearTimeout(t);
  }, [fetchCredits, fetchQueue, fetchUserProfile, fetchImages]);

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    authInitialized,
    getAuthHeaders,
    signOut,
    createdImages,
    importedImages,
    isLoadingCreated,
    isLoadingImported,
    creditsData,
    isLoadingCredits,
    queueData,
    userProfile,
    isLoadingProfile,
    fetchUserProfile,
    updateUserProfile,
    fetchImages,
    fetchCredits,
    fetchQueue,
    addImportedImages,
    addCreatedImage,
    deleteImportedImage,
    setCreditsData,
    setQueueData,
    setUserProfile,
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
