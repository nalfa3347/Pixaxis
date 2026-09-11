export async function downloadImage(url, filename = 'pixaxis_image.png') {
  if (!url) return false;

  try {
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return true;
    }

    const downloadEndpoint = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const res = await fetch(downloadEndpoint);
    if (!res.ok) throw new Error('Échec du téléchargement serveur');

    const blob = await res.blob();
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
    const a = document.createElement('a');
    a.href = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  }
}
