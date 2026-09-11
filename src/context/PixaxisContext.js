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
      if (isCreated) setIsLoadingCreated(true);\n      else setIsLoadingImported(true);\n    }\n\n    try {\n      const res = await fetch(`/api/images?tab=${tab}`);\n      if (res.ok) {\n        const data = await res.json();\n        const images = data.images || [];\n        if (isCreated) setCreatedImages(images);\n        else setImportedImages(images);\n        lastFetchedRef.current[tab] = Date.now();\n        return images;\n      }\n    } catch (err) {\n      console.warn(`Erreur récupération images (${tab}):`, err);\n    } finally {\n      if (isCreated) setIsLoadingCreated(false);\n      else setIsLoadingImported(false);\n    }\n    return currentData || [];\n  }, [createdImages, importedImages]);\n\n  // ─── Récupération des crédits (avec cache en mémoire) ───\n  const fetchCredits = useCallback(async (force = false) => {\n    const now = Date.now();\n    if (creditsData !== null && !force && now - lastFetchedRef.current.credits < 30000) {\n      return creditsData;\n    }\n\n    const shouldShowSpinner = creditsData === null;\n    if (shouldShowSpinner) setIsLoadingCredits(true);\n\n    try {\n      const res = await fetch('/api/credits');\n      if (res.ok) {\n        const data = await res.json();\n        setCreditsData(data);\n        lastFetchedRef.current.credits = Date.now();\n        return data;\n      }\n    } catch (err) {\n      console.warn('Erreur chargement crédits:', err);\n    } finally {\n      setIsLoadingCredits(false);\n    }\n    return creditsData;\n  }, [creditsData]);\n\n  // ─── Récupération de la file glissante ───\n  const fetchQueue = useCallback(async () => {\n    try {\n      const res = await fetch('/api/queue');\n      if (res.ok) {\n        const data = await res.json();\n        setQueueData(data);\n        return data;\n      }\n    } catch (err) {\n      console.warn('Erreur chargement file:', err);\n    }\n    return queueData;\n  }, [queueData]);\n\n  // ─── Action : Ajouter des images importées dans le cache ───\n  const addImportedImages = useCallback((newImages) => {\n    if (!newImages || newImages.length === 0) return;\n    setImportedImages((prev) => {\n      const existing = prev || [];\n      const added = newImages.filter((ni) => !existing.some((e) => (e.id && e.id === ni.id) || e.url === ni.url));\n      return [...added, ...existing];\n    });\n  }, []);\n\n  // ─── Action : Ajouter une image générée dans le cache ───\n  const addCreatedImage = useCallback((newImage, creditsDeducted = 0) => {\n    if (!newImage) return;\n    setCreatedImages((prev) => [newImage, ...(prev || [])]);\n\n    if (creditsDeducted > 0) {\n      setCreditsData((prev) => {\n        if (!prev) return prev;\n        const newTotal = Math.max(0, (prev.total_credits || 0) - creditsDeducted);\n        return {\n          ...prev,\n          total_credits: newTotal,\n          fefo_lot: prev.fefo_lot\n            ? { ...prev.fefo_lot, credits_restants: Math.max(0, prev.fefo_lot.credits_restants - creditsDeducted) }\n            : null,\n        };\n      });\n    }\n  }, []);\n\n  // ─── Action : Supprimer définitivement une image importée (API + Cache) ───\n  const deleteImportedImage = useCallback(async (id, url) => {\n    if (!id && !url) return false;\n    try {\n      const res = await fetch(`/api/images?id=${encodeURIComponent(id || '')}&url=${encodeURIComponent(url || '')}`, {\n        method: 'DELETE',\n      });\n      if (!res.ok) {\n        const errData = await res.json();\n        throw new Error(errData.error || 'Échec de la suppression');\n      }\n      setImportedImages((prev) => (prev || []).filter((img) => (id ? img.id !== id : img.url !== url)));\n      return true;\n    } catch (err) {\n      console.error('Erreur deleteImportedImage:', err);\n      throw err;\n    }\n  }, []);\n\n  // Pré-chargement silencieux au lancement\n  useEffect(() => {\n    if (typeof window === 'undefined') return;\n    const path = window.location.pathname;\n    const isAppPage = ['/mes-images', '/creer', '/profil'].some(p => path.startsWith(p));\n    if (!isAppPage) return;\n\n    fetchCredits();\n    fetchQueue();\n    const t = setTimeout(() => {\n      fetchImages('created');\n      fetchImages('imported');\n    }, 100);\n    return () => clearTimeout(t);\n  }, []);\n\n  return (\n    <PixaxisContext.Provider value={{\n      createdImages,\n      importedImages,\n      isLoadingCreated,\n      isLoadingImported,\n      creditsData,\n      isLoadingCredits,\n      queueData,\n      fetchImages,\n      fetchCredits,\n      fetchQueue,\n      addImportedImages,\n      addCreatedImage,\n      deleteImportedImage,\n      setCreditsData,\n      setQueueData,\n    }}>\n      {children}\n    </PixaxisContext.Provider>\n  );\n}\n\nexport function usePixaxis() {\n  const context = useContext(PixaxisContext);\n  if (!context) {\n    throw new Error('usePixaxis doit être utilisé au sein de PixaxisProvider');\n  }\n  return context;\n}\n