/**
 * PIXAXIS — Fast Image Downloader
 * Déclenche le téléchargement direct d'une image générée ou importée en moins de 3 secondes.
 */

/**
 * Télécharge une image de façon fluide vers l'appareil de l'utilisateur.
 * Enregistre directement le fichier dans le dossier Téléchargements (PC)
 * ou propose l'enregistrement direct dans la Galerie Photo (Mobile).
 * 
 * @param {string} url - URL de l'image (Supabase Storage, CDN ou Data URL)
 * @param {string} [filename='pixaxis_image.png'] - Nom suggéré pour le fichier
 * @returns {Promise<boolean>}
 */
export async function downloadImage(url, filename = 'pixaxis_image.png') {
  if (!url) return false;

  try {
    // 1. Si c'est déjà une data URL ou une URL blob locale
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    // 2. Appel de la route serveur dédiée avec en-têtes Content-Disposition: attachment
    const downloadEndpoint = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const res = await fetch(downloadEndpoint);
    if (!res.ok) throw new Error('Échec du téléchargement serveur');

    const blob = await res.blob();

    // 3. Sur mobile (iOS / Android) : support natif pour "Enregistrer l'image" dans la Galerie Photos
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    if (isMobile && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: blob.type || 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: filename,
          });
          return true;
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') return true;
        console.warn('Share API non disponible, bascule vers téléchargement direct:', shareErr);
      }
    }

    // 4. Enregistrement direct sur disque (dossier Téléchargements)
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(blobUrl), 3000);
    return true;
  } catch (err) {
    console.warn('Fallback téléchargement direct:', err);
    // Fallback via navigation d'attachement serveur
    const a = document.createElement('a');
    a.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}

