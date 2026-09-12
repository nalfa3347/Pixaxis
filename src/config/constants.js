/**
 * PIXAXIS — Source unique de vérité pour toutes les règles métier.
 * 
 * Toute modification de prix, type, style, format, ou règle métier
 * doit se faire UNIQUEMENT dans ce fichier.
 * Aucune duplication ailleurs dans le code.
 */

// ─── Types de création ───────────────────────────────────────────
export const CREATION_TYPES = [
  { id: 'logo', label: 'Logo', icon: '✦', description: 'Logo professionnel' },
  { id: 'poster', label: 'Affiche', icon: '🖼️', description: 'Affiche / Poster' },
  { id: 'banner', label: 'Bannière', icon: '📐', description: 'Bannière réseaux sociaux / site web' },
  { id: 'avatar', label: 'Photo de profil', icon: '👤', description: 'Photo de profil / Avatar' },
  { id: 'product', label: 'Publicité produit', icon: '📦', description: 'Packshot / Visuel publicitaire' },
];

// ─── Styles visuels ──────────────────────────────────────────────
export const VISUAL_STYLES = [
  { id: 'realistic', label: 'Réaliste', description: 'Photo-réaliste, haute fidélité' },
  { id: 'minimalist', label: 'Minimaliste', description: 'Formes épurées, couleurs limitées' },
  { id: '3d', label: '3D / Illustration', description: 'Illustration moderne, rendu 3D' },
];

// ─── Formats de sortie ───────────────────────────────────────────
export const FORMATS = [
  { id: '1024x1024', label: 'Carré 1:1', ratio: '1:1', description: 'Posts réseaux sociaux' },
  { id: '1024x1792', label: 'Portrait 9:16', ratio: '9:16', description: 'Stories, réseaux verticaux' },
  { id: '1792x1024', label: 'Paysage 16:9', ratio: '16:9', description: 'Bannières, présentations' },
];

// ─── Crédits & Packs (Source unique de vérité) ───────────────────
const RAW_PACKS = [
  {
    id: 'decouverte',
    name: 'Découverte',
    price_fcfa: 1000,
    cost_per_generation: 200,
    credits_credited: 1000,
    validity_days: 30,
    validity_label: '30 jours',
    images_label: '5 images',
    bonus_text: null,
    popular: false,
    tagline: 'Pour découvrir la puissance de l’IA',
    features: [
      '5 créations en haute résolution',
      '200 crédits par génération',
      'Tous les 5 types de création',
      'Tous les 3 styles visuels & 3 formats',
      'Validité 30 jours',
      'Téléchargement direct galerie / PC',
    ],
  },
  {
    id: 'createur',
    name: 'Créateur',
    price_fcfa: 3000,
    cost_per_generation: 180,
    credits_credited: 3060, // Bonus de fidélité inclus (16 + 1 bonus)
    validity_months: 3,
    validity_label: '3 mois',
    images_label: '17 images (16 + 1 bonus)',
    bonus_text: '+1 image bonus offerte',
    popular: true,
    tagline: 'Le choix idéal pour les créateurs réguliers',
    features: [
      '17 créations au total (16 + 1 offerte)',
      'Coût réduit : 180 crédits / image',
      '3 060 crédits réels crédités',
      'Validité confortable de 3 mois',
      'Jusqu’à 3 images de référence',
      'Support client prioritaire WhatsApp',
    ],
  },
  {
    id: 'professionnel',
    name: 'Professionnel',
    price_fcfa: 5000,
    cost_per_generation: 160,
    credits_credited: 5120, // Bonus de fidélité inclus (31 + 1 bonus)
    validity_months: 6,
    validity_label: '6 mois',
    images_label: '32 images (31 + 1 bonus)',
    bonus_text: '+1 image bonus offerte',
    popular: false,
    tagline: 'Pour les PME, commerçants & freelances',
    features: [
      '32 créations au total (31 + 1 offerte)',
      'Économie forte : 160 crédits / image',
      '5 120 crédits réels crédités',
      'Validité étendue à 6 mois',
      'Licence commerciale complète',
      'Support direct par email et téléphone',
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    price_fcfa: 15000,
    cost_per_generation: 150,
    credits_credited: 15000,
    validity_months: 12,
    validity_label: '1 an',
    images_label: '100 images',
    bonus_text: 'Meilleur tarif par image',
    popular: false,
    tagline: 'Pour les agences et productions intensives',
    features: [
      '100 créations en haute résolution',
      'Tarif le plus bas : 150 crédits / image',
      '15 000 crédits réels crédités',
      'Validité maximale de 1 an',
      'Gestion multi-références (3 images)',
      'Assistance VIP WhatsApp dédiée',
    ],
  },
];

/**
 * Table des packs avec nombre d'images calculé dynamiquement
 * (credits_credited ÷ cost_per_generation).
 */
export const CREDIT_PACKS = RAW_PACKS.map((pack) => ({
  ...pack,
  images_count: Math.floor(pack.credits_credited / pack.cost_per_generation),
}));

/**
 * Récupère la configuration d'un pack par son ID.
 * @param {string} packId - ID du pack (decouverte | createur | professionnel | studio)
 * @returns {object|null}
 */
export function getPackById(packId) {
  return CREDIT_PACKS.find((p) => p.id === packId) || null;
}

/**
 * Calcule la date d'expiration exacte d'un pack à partir d'une date donnée.
 * @param {object|string} packOrId - Objet pack ou ID de pack
 * @param {Date|string} [fromDate=new Date()] - Date de départ
 * @returns {Date}
 */
export function calculateExpirationDate(packOrId, fromDate = new Date()) {
  const pack = typeof packOrId === 'string' ? getPackById(packOrId) : packOrId;
  if (!pack) throw new Error(`Pack inconnu: ${packOrId}`);
  const d = new Date(fromDate);
  if (pack.validity_days) {
    d.setDate(d.getDate() + pack.validity_days);
  } else if (pack.validity_months) {
    d.setMonth(d.getMonth() + pack.validity_months);
  }
  return d;
}

// ─── Limites et validation ───────────────────────────────────────
export const MAX_REFERENCE_IMAGES = 1; // Règle stricte : 1 image produit par génération
export const MAX_IMAGE_DIMENSION_PX = 1024;
export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_UPLOAD_SIZE_MB = 10;
export const MAX_IMAGE_DIMENSION_SERVER_PX = 2048;
// ─── Modèle et API de génération (STRICTEMENT IDEOGRAM 4.0) ───────
export const IDEOGRAM_MODEL = 'IDEOGRAM 4.0';
export const IDEOGRAM_API_BASE_URL = 'https://api.ideogram.ai';
export const IDEOGRAM_V4_GENERATE_ENDPOINT = 'https://api.ideogram.ai/v1/ideogram-v4/generate';
export const IDEOGRAM_V4_REMIX_ENDPOINT = 'https://api.ideogram.ai/v1/ideogram-v4/remix';

// Mapping strict vers les résolutions supportées par Ideogram 4.0 (ResolutionV4)
export const IDEOGRAM_V4_RESOLUTIONS = {
  '1024x1024': '1024x1024', // Carré 1:1
  '1024x1792': '1440x2560', // Portrait 9:16 (Story, Reels, Mobile)
  '1792x1024': '2560x1440', // Paysage 16:9 (Bannière, Cover, Présentation)
};

export function getIdeogramV4Resolution(formatId) {
  return IDEOGRAM_V4_RESOLUTIONS[formatId] || '1024x1024';
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// ─── Pipeline & Rôles des images (Source unique de vérité) ───────
// Règle d'or PIXAXIS :
// 1. Image produit = référence principale envoyée à Ideogram 4.0 pour créer la scène
// 2. Logo = fichier original conservé séparément (sans altération ni hallucination IA)
// 3. Ideogram 4 = génération de la scène / publicité haute conversion autour du produit
// 4. Logo = ajout ultérieur par l'application via Sharp (haute netteté vectorielle)
export const IMAGE_ROLES = [
  {
    id: 'product',
    label: '1. Produit',
    title: 'Image Produit (Référence principale)',
    description: 'Référence principale du produit pour Ideogram 4 — fidélité maximale (forme, proportions, couleurs, matière, détails)',
    promptInstruction: 'The primary reference image is the PRODUCT PHOTO (MAIN REFERENCE): Preserve its exact shape, proportions, colors, materials, components, details and design with maximum fidelity. Ideogram 4 must generate a premium, high-converting commercial advertising scene, environment, lighting, and composition around this exact product. Do NOT alter the product identity.',
  },
  {
    id: 'logo',
    label: '2. Logo',
    title: 'Logo de marque (Conservé séparément)',
    description: 'Logo original de la marque — conservé séparément sans altération pour être intégré ultérieurement par l’application',
    promptInstruction: 'The brand logo is preserved separately as the original high-resolution graphic. Compose the advertising scene leaving balanced negative space for subsequent official logo placement.',
  },
  {
    id: 'style',
    label: '3. Style / Ambiance',
    title: 'Style / Ambiance (Inspiration visuelle)',
    description: 'Inspiration esthétique pour le décor de scène (éclairage, colorimétrie, texture, ambiance publicitaire)',
    promptInstruction: 'The style reference is for MOOD & LIGHTING INSPIRATION: Use it for ambient studio lighting, color palette, and advertising backdrop. Do NOT reproduce this image literally.',
  },
];

// ─── Mapping type+style+format → prompt (interne, jamais exposé au client) ──
// Ce mapping est utilisé côté serveur uniquement pour construire le prompt final.
export const PROMPT_TEMPLATES = {
  logo: {
    realistic: 'Create a professional, high-end photo-realistic brand logo on an elegant textured backdrop',
    minimalist: 'Create a clean, minimalist luxury brand logo with pure geometric shapes and refined color palette',
    '3d': 'Create a modern 3D sculpted brand emblem with realistic depth, subtle reflections, and contemporary lighting',
  },
  poster: {
    realistic: 'Create a professional high-impact advertising campaign poster with dramatic cinematic lighting, rich details, bold commercial composition, and pristine commercial photography quality',
    minimalist: 'Create a sleek, minimalist advertising poster with strong visual hierarchy, clean lines, elegant focal point, and sophisticated commercial styling',
    '3d': 'Create a visually striking 3D illustrated advertising poster with volumetric lighting, vibrant textures, modern depth of field, and bold commercial layout',
  },
  banner: {
    realistic: 'Create a professional commercial advertising banner with wide scenic composition, luxury studio lighting, and high-impact commercial visual appeal',
    minimalist: 'Create a modern minimalist commercial banner with clean lines, elegant focal elements, and polished advertising layout',
    '3d': 'Create a dynamic 3D commercial advertising banner with modern perspective, depth, atmospheric lighting, and eye-catching visual rendering',
  },
  avatar: {
    realistic: 'Create a professional, photo-realistic high-fashion portrait or avatar with studio lighting and natural skin tones',
    minimalist: 'Create a minimalist artistic portrait with clean silhouette and elegant monochrome or duo-tone lighting',
    '3d': 'Create a stylish 3D-rendered character avatar with modern CGI lighting, expressive features, and polished textures',
  },
  product: {
    realistic: 'Create a high-impact commercial advertising visual and product hero campaign. The product is staged in a spectacular professional advertising environment, featuring tailored pedestals (such as dark obsidian, wet stone, or sculpted noble textures), volumetric cinematic studio lighting, crisp reflections, dynamic splashes or atmospheric steam, depth of field, and high-conversion commercial art direction',
    minimalist: 'Create an ultra-clean, elegant luxury product advertisement with refined editorial studio lighting, sophisticated monochromatic or muted color harmony, architectural pedestal staging, strong visual hierarchy, and ample breathing room for a premium commercial look',
    '3d': 'Create a dynamic commercial product advertisement with dramatic lighting, modern 3D depth, floating particle effects, energetic reflections, bold advertising layout, and high-end commercial visual impact',
  },
};

export const MAX_ADDITIONAL_PROMPT_LENGTH = 500;
export const MAX_CONCURRENT_GENERATIONS = 10;

/**
 * Construit le prompt final à partir des choix utilisateur.
 * À utiliser UNIQUEMENT côté serveur.
 * 
 * Pipeline officiel :
 * - Image produit = référence principale
 * - Logo = fichier original conservé séparément
 * - Ideogram 4 = génération de la scène/publicité
 * - Logo = ajout ultérieur par l’application
 * 
 * @param {string} type - ID du type de création
 * @param {string} style - ID du style visuel
 * @param {number} imageCount - Nombre d'images de référence fournies (0 ou 1)
 * @param {string} [additionalPrompt] - Détail optionnel saisi par l'utilisateur (max 500 chars)
 * @param {string} [format] - Format d'image ('1024x1024', '1024x1792', '1792x1024')
 * @returns {string} Prompt structuré pour l'API Ideogram 4.0
 */
export function buildPrompt(type, style, imageCount = 0, additionalPrompt = '', format = '1024x1024') {
  const basePrompt = PROMPT_TEMPLATES[type]?.[style] || 'Create a high-impact professional commercial advertising visual';
  let prompt = basePrompt;

  const sanitized = additionalPrompt && typeof additionalPrompt === 'string' ? additionalPrompt.trim().slice(0, MAX_ADDITIONAL_PROMPT_LENGTH) : '';

  if (sanitized) {
    prompt += `.\n\nCREATIVE ADVERTISING DIRECTION & SCENARIO: ${sanitized}`;
  }

  // Cadrage et composition selon le format
  if (format === '1024x1792') {
    prompt += '.\n\nFORMAT & COMPOSITION: Dominant, commanding vertical commercial composition (9:16). The product is heroically framed as the central anchor with vertical visual hierarchy, cinematic studio depth, and balanced negative space.';
  } else if (format === '1792x1024') {
    prompt += '.\n\nFORMAT & COMPOSITION: Wide cinematic commercial presentation (16:9) with expansive advertising depth, sophisticated background environment, and professional billboard layout.';
  } else {
    prompt += '.\n\nFORMAT & COMPOSITION: Perfectly centered, iconic commercial square composition (1:1) with balanced symmetry and strong product focus.';
  }

  // Instructions strictes pour la fidélité produit et la mise en scène publicitaire (Ideogram 4.0)
  if (imageCount > 0) {
    prompt += '.\n\nABSOLUTE PRODUCT FIDELITY & COMMERCIAL STAGING (IDEOGRAM 4.0):\n' +
      '- CRITICAL: The input product image is the ABSOLUTE PRIMARY REFERENCE. Preserve with flawless fidelity its exact shape, geometry, proportions, authentic colors, textures, materials, packaging, and visible label typography.\n' +
      '- DO NOT alter, reshape, distort, or redesign the product. Adapt the commercial advertising environment, pedestal, reflections, splashes, and cinematic lighting around the product, NEVER adapt the product to the style.\n' +
      '- The scene must look like a high-end commercial advertising studio production, not an isolated product on a plain background.\n' +
      '- High-contrast, sharp photographic rendering, atmospheric depth, realistic reflections and physical textures.\n' +
      '- Official brand logos are preserved separately and will be integrated cleanly without AI deformation.';
  }

  prompt += '.\nUltra high resolution, 8k commercial photography, award-winning advertising art direction.';

  return prompt;
}

// ─── Navigation ──────────────────────────────────────────────────
export const PAGES = [
  { id: 'mes-images', path: '/mes-images', label: 'Mes images', icon: 'images' },
  { id: 'creer', path: '/creer', label: 'Créer', icon: 'create' },
  { id: 'profil', path: '/profil', label: 'Profil', icon: 'profile' },
];

// ─── Design tokens (miroir des CSS custom properties) ────────────
export const DESIGN = {
  colors: {
    background: '#000000',
    accent: '#00E5FF',
    accentDim: 'rgba(0, 229, 255, 0.15)',
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    surface: '#0A0A0A',
    surfaceElevated: '#111111',
    border: 'rgba(255, 255, 255, 0.08)',
    error: '#FF4444',
    success: '#00E676',
  },
};
