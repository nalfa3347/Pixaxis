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
      'Jusqu’à 10 images de référence',
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
      'Gestion multi-références (10 images)',
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
export const MAX_REFERENCE_IMAGES = 10;
export const MAX_IMAGE_DIMENSION_PX = 1024;
export const MAX_UPLOAD_SIZE_MB = 10;
export const OPENAI_IMAGE_QUALITY = 'medium';
export const OPENAI_MODEL = 'gpt-image-2';

// ─── Mapping type+style+format → prompt (interne, jamais exposé au client) ──
// Ce mapping est utilisé côté serveur uniquement pour construire le prompt final.
export const PROMPT_TEMPLATES = {
  logo: {
    realistic: 'Create a professional, photo-realistic logo design',
    minimalist: 'Create a clean, minimalist logo with simple geometric shapes and limited color palette',
    '3d': 'Create a modern 3D-rendered logo with depth, lighting effects, and contemporary design',
  },
  poster: {
    realistic: 'Create a high-quality, photo-realistic poster design',
    minimalist: 'Create a minimalist poster with clean typography, ample white space, and limited colors',
    '3d': 'Create a visually striking 3D illustrated poster with modern rendering and bold composition',
  },
  banner: {
    realistic: 'Create a professional, photo-realistic banner suitable for social media or website header',
    minimalist: 'Create a clean, minimalist banner with simple design elements and subtle color palette',
    '3d': 'Create a dynamic 3D-rendered banner with modern illustration style for digital platforms',
  },
  avatar: {
    realistic: 'Create a professional, photo-realistic profile picture or avatar',
    minimalist: 'Create a minimalist avatar or profile picture with clean lines and limited colors',
    '3d': 'Create a stylish 3D-rendered avatar or profile picture with modern character design',
  },
  product: {
    realistic: 'Create a professional product photography packshot with studio lighting and clean background',
    minimalist: 'Create a minimalist product advertisement with clean composition and limited color palette',
    '3d': 'Create a modern 3D-rendered product visualization with dramatic lighting and contemporary styling',
  },
};

export const MAX_ADDITIONAL_PROMPT_LENGTH = 150;
export const MAX_CONCURRENT_GENERATIONS = 10;

/**
 * Construit le prompt final à partir des choix utilisateur.
 * À utiliser UNIQUEMENT côté serveur.
 * 
 * @param {string} type - ID du type de création
 * @param {string} style - ID du style visuel
 * @param {boolean} hasReferenceImages - Si des images de référence sont fournies
 * @param {string} [additionalPrompt] - Détail optionnel saisi par l'utilisateur (max 150 chars)
 * @returns {string} Prompt structuré pour l'API OpenAI
 */
export function buildPrompt(type, style, hasReferenceImages, additionalPrompt = '') {
  const basePrompt = PROMPT_TEMPLATES[type]?.[style];
  
  if (!basePrompt) {
    throw new Error(`Combinaison type/style invalide: ${type}/${style}`);
  }

  let prompt = basePrompt;

  if (hasReferenceImages) {
    prompt += '. Use the provided reference image(s) as inspiration for the style, colors, and composition';
  }

  // Ajout du détail optionnel de l'utilisateur s'il est renseigné (max 150 caractères)
  if (additionalPrompt && typeof additionalPrompt === 'string') {
    const sanitized = additionalPrompt.trim().slice(0, MAX_ADDITIONAL_PROMPT_LENGTH);
    if (sanitized) {
      prompt += `. Additional detail: ${sanitized}`;
    }
  }

  prompt += '. High quality, professional result, suitable for commercial use.';

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
