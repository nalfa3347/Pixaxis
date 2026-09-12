/**
 * PIXAXIS — Server-Side Image Processor
 * Redimensionne et compresse les images de référence côté serveur avant envoi à l'API OpenAI.
 * 
 * Utilise sharp pour un traitement performant et fiable.
 * Limite : 2048px max en largeur ou hauteur, compression PNG pour l'API OpenAI.
 */

import sharp from 'sharp';
import { MAX_REFERENCE_IMAGES, MAX_IMAGE_SIZE_MB, MAX_IMAGE_DIMENSION_SERVER_PX, ACCEPTED_IMAGE_TYPES } from '../config/constants.js';

/**
 * Valide un fichier image côté serveur.
 * @param {Blob|File} file - Fichier image
 * @param {number} index - Index de l'image (0, 1, 2)
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file, index = 0) {
  if (!file || !(file instanceof Blob)) {
    return { valid: false, error: 'Fichier image invalide ou manquant.' };
  }

  const maxBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: 'Cette image est trop lourde. Taille maximale : 5 MB.' };
  }

  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { valid: false, error: `Format d'image non accepté (${file.type}). Formats autorisés : JPEG, PNG, WebP, GIF.` };
  }

  return { valid: true };
}

/**
 * Valide un ensemble d'images de référence côté serveur.
 * @param {Array<Blob|File>} files - Liste des fichiers images
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFiles(files) {
  if (!Array.isArray(files)) {
    return { valid: false, error: 'Les images de référence doivent être un tableau.' };
  }

  if (files.length > MAX_REFERENCE_IMAGES) {
    return { valid: false, error: 'Maximum 1 image produit par génération autorisée.' };
  }

  for (let i = 0; i < files.length; i++) {
    const result = validateImageFile(files[i], i);
    if (!result.valid) return result;
  }

  return { valid: true };
}

/**
 * Redimensionne et compresse une image pour l'envoi à l'API OpenAI.
 * - Redimensionne à 2048px max (préserve le ratio)
 * - Convertit en PNG (format requis par l'API OpenAI images/edits)
 * - Compresse pour rester sous ~2 Mo
 * 
 * @param {Buffer} inputBuffer - Buffer de l'image source
 * @param {number} [maxDimension=2048] - Dimension maximale en px
 * @returns {Promise<Buffer>} Buffer PNG optimisé
 */
export async function processImageForOpenAI(inputBuffer, maxDimension = MAX_IMAGE_DIMENSION_SERVER_PX) {
  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    let pipeline = image;

    // Redimensionner si nécessaire (préserver le ratio)
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      pipeline = pipeline.resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convertir en PNG (format le plus fiable pour l'API OpenAI)
    const outputBuffer = await pipeline
      .png({ quality: 85, compressionLevel: 6 })
      .toBuffer();

    return outputBuffer;
  } catch (err) {
    console.error('Erreur traitement image sharp:', err);
    // Fallback : retourner le buffer original si sharp échoue
    return inputBuffer;
  }
}

/**
 * Traite toutes les images de référence pour l'envoi à l'API OpenAI.
 * @param {Array<Blob|File>} files - Liste des fichiers images
 * @returns {Promise<Array<Buffer>>} Liste de buffers PNG optimisés, dans l'ordre des rôles
 */
export async function processAllImagesForOpenAI(files) {
  const processedBuffers = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const processed = await processImageForOpenAI(buffer);
    processedBuffers.push(processed);
  }

  return processedBuffers;
}
