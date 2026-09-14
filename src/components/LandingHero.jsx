'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const InstallAppModal = dynamic(() => import('./InstallAppModal'), { ssr: false });

// 30 images haute fidélité pour le studio PIXAXIS (20 publicités produits + 10 lifestyle / lieux / véhicules)
const MOCKUP_SHOWCASE_IMAGES = [
  // 1. [PRODUIT] Garnier AquaMen (Réf 1)
  {
    id: 1,
    category: 'produit',
    url: '/showcase/ad-garnier-aquamen.jpg',
    alt: 'Publicité soin purifiant visage Garnier AquaMen avec splash eau fraîche',
    title: 'Garnier AquaMen — Soin Purifiant',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '9:16',
  },
  // 2. [PRODUIT] Sneakers Running Rouge Performance
  {
    id: 2,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Sneakers Nike rouge vif packshot publicitaire commercial',
    title: 'Sneakers Running Rouge Performance',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 3. [AUTRE] Supercar de Luxe (Position 3)
  {
    id: 3,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Supercar sportive de luxe lancée sur une route côtière',
    title: 'Supercar de Luxe — Ligne Aérodynamique',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 4. [PRODUIT] Sac à Main Cuir Pleine Fleur
  {
    id: 4,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Sac à main femme en cuir de luxe avec finitions or',
    title: 'Sac à Main Cuir Pleine Fleur & Finitions Or',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 5. [PRODUIT] Montre Chronographe Titane & Or
  {
    id: 5,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Montre chronographe titane et or de luxe horlogerie prestige',
    title: 'Montre Chronographe Titane & Or',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 6. [AUTRE] Veste Blazer Élégante
  {
    id: 6,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Veste blazer élégante coupe italienne prêt-à-porter',
    title: 'Veste Blazer Élégante Coupe Italienne',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 7. [PRODUIT] Dove Crème Coco & Amande (Réf 2)
  {
    id: 7,
    category: 'produit',
    url: '/showcase/ad-dove-coconut.jpg',
    alt: 'Publicité crème nourrissante Dove rituel coco et amande en décor cascade tropicale',
    title: 'Dove — Crème Coco & Amande',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '9:16',
  },
  // 8. [PRODUIT] iPhone Pro Écran Super Retina
  {
    id: 8,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Smartphone premium iPhone Pro sur fond sombre reflets biseautés',
    title: 'iPhone Pro — Écran Super Retina',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 9. [AUTRE] Piscine à Débordement sur l'Océan
  {
    id: 9,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Piscine à débordement turquoise avec vue infinie sur l’océan',
    title: 'Piscine à Débordement sur l’Océan',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
  // 10. [PRODUIT] Casquette Streetwear Black Edition
  {
    id: 10,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Casquette streetwear brodée noire tendance mode urbaine',
    title: 'Casquette Streetwear Black Edition',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 11. [AUTRE] Athlète Fitness Homme Musclé à la Plage (Position 11)
  {
    id: 11,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Homme musclé et athlétique à la plage au coucher de soleil',
    title: 'Athlète Fitness au Coucher de Soleil',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 12. [PRODUIT] Nescafé Classic (Réf 3)
  {
    id: 12,
    category: 'produit',
    url: '/showcase/ad-nescafe-coffee.jpg',
    alt: 'Affiche publicitaire Nescafé Classic avec grain de café torréfié explosant',
    title: 'Nescafé Classic — Arôme Intense',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 13. [PRODUIT] PC Portable Ultra-Fin Pro Studio
  {
    id: 13,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Ordinateur portable ultra-fin PC Pro créateur en aluminium brossé',
    title: 'PC Portable Ultra-Fin Pro Studio',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  // 14. [AUTRE] Moto Sportive Haute Performance
  {
    id: 14,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Moto sportive de course noire et chromée sur piste urbaine',
    title: 'Moto Sportive V-Twin Performance',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 15. [PRODUIT] Savon Artisanal Bio & Karité Naturel
  {
    id: 15,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Savon artisanal bio moussant aux huiles essentielles et argile',
    title: 'Savon Artisanal Bio & Karité Naturel',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 16. [PRODUIT] Lunettes Solaires Noir & Or Luxe
  {
    id: 16,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Lunettes de soleil designer noir et or verres polarisés',
    title: 'Lunettes Solaires Noir & Or Luxe',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  // 17. [AUTRE] Architecture Contemporaine Villa Design
  {
    id: 17,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Architecture contemporaine villa design avec larges baies vitrées',
    title: 'Architecture Contemporaine Villa Design',
    type: 'Bannière',
    style: 'Minimaliste',
    format: '1:1',
  },
  // 18. [PRODUIT] Parfum Black Orchid Prestige
  {
    id: 18,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Parfum de luxe flacon noir et or prestige haute parfumerie',
    title: 'Parfum Black Orchid Prestige',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 19. [PRODUIT] Chaussures Richelieu Cuir Italien
  {
    id: 19,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Chaussures richelieu homme en cuir italien ciré sur marbre',
    title: 'Chaussures Richelieu Cuir Italien',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 20. [AUTRE] Mode Enfant — Vêtement Stylé
  {
    id: 20,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Enfant portant un vêtement stylé et moderne collection mode',
    title: 'Mode Enfant — Collection Tendance',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 21. [PRODUIT] Nexora Move Écouteurs Sans Fil (Réf 4 - Position 21)
  {
    id: 21,
    category: 'produit',
    url: '/showcase/ad-nexora-earbuds.jpg',
    alt: 'Publicité écouteurs sans fil Nexora Move sur socle roche et néon',
    title: 'Nexora Move — Écouteurs Sans Fil',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
  // 22. [PRODUIT] Smartwatch Connectée Pulse Sport
  {
    id: 22,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Montre connectée smartwatch sport et suivi fitness cadran OLED',
    title: 'Smartwatch Connectée Pulse Sport',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
  // 23. [AUTRE] Complet Costume Élégant Garçon
  {
    id: 23,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Complet costume chic pour garçon prêt-à-porter habillé',
    title: 'Complet Costume Élégant Garçon',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 24. [PRODUIT] Chargeur GaN Ultra-Rapide 65W
  {
    id: 24,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Chargeur rapide GaN compact et batterie externe powerbank',
    title: 'Chargeur GaN Ultra-Rapide 65W',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  // 25. [PRODUIT] Canette Splash Citrus Energy Drink
  {
    id: 25,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Boisson rafraîchissante canette avec éclaboussures de fraîcheur',
    title: 'Canette Splash Citrus Energy Drink',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 26. [AUTRE] Robe de Gala Haute Couture en Mouvement
  {
    id: 26,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Robe de gala haute couture en mouvement pour campagne de mode',
    title: 'Robe de Gala Haute Couture en Mouvement',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  // 27. [PRODUIT] Adidas After Sport Gel Douche (Réf 5)
  {
    id: 27,
    category: 'produit',
    url: '/showcase/ad-adidas-sport.jpg',
    alt: 'Publicité gel douche énergisant Adidas After Sport avec athlète et splash',
    title: 'Adidas After Sport — Gel Douche',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 28. [PRODUIT] Jus d’Orange Artisanal — Splash Fraîcheur
  {
    id: 28,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Bouteille de jus d’orange pur fruit avec éclaboussure vitaminée',
    title: 'Jus d’Orange Artisanal — Splash Fraîcheur',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  // 29. [AUTRE] Restaurant Gastronomique Vue Mer
  {
    id: 29,
    category: 'autre',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Restaurant gastronomique terrasse chic en bord de mer au coucher de soleil',
    title: 'Restaurant Gastronomique Vue Mer',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
  // 30. [PRODUIT] Casque Audio Studio Sans Fil Hi-Fi
  {
    id: 30,
    category: 'produit',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=440&h=440&fit=crop&auto=format&q=65',
    alt: 'Casque audio haute fidélité studio sans fil sur fond noir',
    title: 'Casque Audio Studio Sans Fil Hi-Fi',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
];

export default function LandingHero() {
  // Défilement fluide toutes les 3.8 secondes débutant à l'image locale optimisée (0ms latence)
  const [currentIndex, setCurrentIndex] = useState(0);
  const [installModalOpen, setInstallModalOpen] = useState(false);

  useEffect(() => {
    // Rotation toutes les 3.8 secondes pour une présentation vive et dynamique
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MOCKUP_SHOWCASE_IMAGES.length);
    }, 3800);

    return () => clearInterval(interval);
  }, []);

  const activeImage = MOCKUP_SHOWCASE_IMAGES[currentIndex] || MOCKUP_SHOWCASE_IMAGES[0];

  return (
    <section className="landing-hero" id="hero">
      {/* Background radial cyan glow */}
      <div className="landing-hero__radial-glow" aria-hidden="true" />

      <div className="landing-hero__content">
        {/* Pill Badge */}
        <div className="landing-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <span>CRÉATION D'IMAGES IA</span>
        </div>

        {/* Headline - ultra-court et percutant */}
        <h1 className="landing-hero__headline">
          Créez vos visuels pro{' '}
          <span className="landing-hero__headline-accent">
            avec l'IA.
          </span>
        </h1>

        {/* Subtitle - 1 seule phrase concise */}
        <p className="landing-hero__lead">
          Logos, affiches, bannières et pubs générés en quelques secondes.
        </p>

        {/* Dual Call To Action */}
        <div className="landing-hero__cta-group">
          <Link href="/connexion?redirect=/creer" className="landing-btn-primary">
            <span>Créer une image</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>

          <button
            type="button"
            onClick={() => setInstallModalOpen(true)}
            className="landing-btn-secondary"
            id="btn-hero-install-app"
            style={{ cursor: 'pointer' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Installer l'app</span>
          </button>
        </div>

        {/* Application Studio Mockup - épuré, abaissé & flottant avec mouvement visible */}
        <div className="landing-mockup" aria-label="Aperçu du studio PIXAXIS">
          <div className="landing-mockup__bar">
            <div className="landing-mockup__dots">
              <span className="landing-mockup__dot landing-mockup__dot--red" />
              <span className="landing-mockup__dot landing-mockup__dot--yellow" />
              <span className="landing-mockup__dot landing-mockup__dot--green" />
            </div>
            <div className="landing-mockup__title">
              <span>Studio PIXAXIS</span>
            </div>
          </div>

          <div className="landing-mockup__body">
            {/* Left Control Column — synchronisée avec l'image active */}
            <div className="landing-mockup__panel">
              <div className="landing-mockup__tag-row">
                <span className="landing-mockup__pill landing-mockup__pill--accent">{activeImage.type}</span>
                <span className="landing-mockup__pill">{activeImage.style}</span>
                <span className="landing-mockup__pill">{activeImage.format}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.70rem', color: 'rgba(255, 255, 255, 0.45)' }}>Rendu IA actif</span>
                <span style={{ fontSize: '0.78rem', color: '#ffffff', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeImage.title}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.6)', paddingTop: '4px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <span>Résolution</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>1024×1024 HD</span>
              </div>
            </div>

            {/* Right Preview Visual — Diaporama 20 images hyper-réalistes avec zoom/dézoom discret */}
            <div className="landing-mockup__preview-canvas">
              {/* Slideshow optimisé : rendu uniquement de l'image active + précharge discrète de la suivante */}
              {MOCKUP_SHOWCASE_IMAGES.map((img, idx) => {
                const isActive = idx === currentIndex;
                const isNext = idx === (currentIndex + 1) % MOCKUP_SHOWCASE_IMAGES.length;
                if (!isActive && !isNext) return null;

                return (
                  <div
                    key={img.id}
                    className={`landing-mockup__slide ${isActive ? 'is-active' : ''}`}
                    aria-hidden={!isActive}
                  >
                    <img
                      src={img.url}
                      alt={img.alt}
                      className="landing-mockup__slide-img"
                      loading={isActive ? 'eager' : 'lazy'}
                      fetchPriority={isActive ? 'high' : 'low'}
                      decoding="async"
                    />
                    <div className="landing-mockup__slide-overlay" />
                  </div>
                );
              })}

              {/* Tag indicateur en haut à droite — 30 créations IA */}
              <div className="landing-mockup__top-badge">
                <span className="landing-mockup__pulse-dot" />
                <span>Pub IA • {currentIndex + 1}/30</span>
              </div>

              {/* Badge d'état en bas */}
              <div className="landing-mockup__live-badge">
                <span style={{ color: '#ffffff', fontWeight: '500' }}>✓ Prête</span>
                <span style={{ color: 'var(--color-accent)', fontWeight: '600' }}>1024×1024</span>
              </div>
          </div>
        </div>
      </div>
    </div>
    {installModalOpen && (
        <InstallAppModal
          isOpen={installModalOpen}
          onClose={() => setInstallModalOpen(false)}
        />
      )}
    </section>
  );
}


