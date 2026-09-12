'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 30 images haute fidélité pour le studio PIXAXIS (20 publicités produits + 10 lifestyle / lieux / véhicules)
const MOCKUP_SHOWCASE_IMAGES = [
  // ─── 20 VISUELS PUBLICITAIRES PRODUITS (focus e-commerce & marques) ───
  {
    id: 1,
    url: '/showcase/ad-garnier-aquamen.jpg',
    alt: 'Publicité soin purifiant visage Garnier AquaMen avec splash eau fraîche',
    title: 'Garnier AquaMen — Soin Purifiant',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '9:16',
  },
  {
    id: 2,
    url: '/showcase/ad-dove-coconut.jpg',
    alt: 'Publicité crème nourrissante Dove rituel coco et amande en décor cascade tropicale',
    title: 'Dove — Crème Coco & Amande',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '9:16',
  },
  {
    id: 3,
    url: '/showcase/ad-nescafe-coffee.jpg',
    alt: 'Affiche publicitaire Nescafé Classic avec grain de café torréfié explosant',
    title: 'Nescafé Classic — Arôme Intense',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 4,
    url: '/showcase/ad-nexora-earbuds.jpg',
    alt: 'Publicité écouteurs sans fil Nexora Move sur socle roche et néon',
    title: 'Nexora Move — Écouteurs Sans Fil',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 5,
    url: '/showcase/ad-adidas-sport.jpg',
    alt: 'Publicité gel douche énergisant Adidas After Sport avec athlète et splash',
    title: 'Adidas After Sport — Gel Douche',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Robe de soirée haute couture émeraude fluide pour e-commerce de mode',
    title: 'Robe de Soirée Émeraude Haute Couture',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Robe d’été fleurie chic collection prêt-à-porter féminin',
    title: 'Robe d’Été Fleurie — Collection Chic',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 8,
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Sneakers Nike rouge vif packshot publicitaire commercial',
    title: 'Sneakers Running Rouge Performance',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 9,
    url: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Chaussures richelieu homme en cuir italien ciré sur marbre',
    title: 'Chaussures Richelieu Cuir Italien',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 10,
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Montre chronographe titane et or de luxe horlogerie prestige',
    title: 'Montre Chronographe Titane & Or',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 11,
    url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Montre connectée smartwatch sport et suivi fitness cadran OLED',
    title: 'Smartwatch Connectée Pulse Sport',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 12,
    url: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Smartphone premium iPhone Pro sur fond sombre reflets biseautés',
    title: 'iPhone Pro — Écran Super Retina',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 13,
    url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Ordinateur portable ultra-fin PC Pro créateur en aluminium brossé',
    title: 'PC Portable Ultra-Fin Pro Studio',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  {
    id: 14,
    url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Chargeur rapide GaN compact et batterie externe powerbank',
    title: 'Chargeur GaN Ultra-Rapide 65W',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  {
    id: 15,
    url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Casquette streetwear brodée noire tendance mode urbaine',
    title: 'Casquette Streetwear Black Edition',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 16,
    url: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Savon artisanal bio moussant aux huiles essentielles et argile',
    title: 'Savon Artisanal Bio & Karité Naturel',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 17,
    url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Parfum de luxe flacon noir et or prestige haute parfumerie',
    title: 'Parfum Black Orchid Prestige',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 18,
    url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Sac à main femme en cuir de luxe avec finitions or',
    title: 'Sac à Main Cuir Pleine Fleur',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 19,
    url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Lunettes de soleil designer noir et or verres polarisés',
    title: 'Lunettes Solaires Noir & Or Luxe',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  {
    id: 20,
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Boisson rafraîchissante canette avec éclaboussures de fraîcheur',
    title: 'Canette Splash Citrus Energy Drink',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },

  // ─── 10 AUTRES : PERSONNES, LIEUX DE PRESTIGE & VÉHICULES ───
  {
    id: 21,
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Portrait mode d’une belle jeune fille lumineuse au regard captivant',
    title: 'Portrait Beauté & Regard Lumineux',
    type: 'Avatar',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 22,
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Belle femme élégante et rayonnante pour campagne publicitaire',
    title: 'Portrait Glamour Femme d’Influence',
    type: 'Avatar',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 23,
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Beau jeune homme confiant en costume moderne pour visuel publicitaire',
    title: 'Portrait Homme Moderne & Charismatique',
    type: 'Avatar',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 24,
    url: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Homme musclé et athlétique à la plage au coucher de soleil',
    title: 'Athlète Fitness au Coucher de Soleil',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 25,
    url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Supercar sportive de luxe lancée sur une route côtière',
    title: 'Supercar de Luxe — Vitesse & Ligne Pure',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 26,
    url: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Moto sportive de course noire et chromée sur piste urbaine',
    title: 'Moto Sportive V-Twin Performance',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 27,
    url: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Moto d’exception stationnée sur une place urbaine illuminée de nuit',
    title: 'La Place Moto — Ambiance Urbaine Nocturne',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 28,
    url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Hôtel resort 5 étoiles de prestige avec façade illuminée et palmiers',
    title: 'Hôtel Resort 5 Étoiles & Palmiers',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 29,
    url: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Piscine à débordement turquoise avec vue infinie sur l’océan',
    title: 'Piscine à Débordement sur l’Océan',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 30,
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=800&fit=crop&auto=format&q=80',
    alt: 'Restaurant gastronomique terrasse chic en bord de mer au coucher de soleil',
    title: 'Restaurant Gastronomique Vue Mer',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
];

export default function LandingHero() {
  // Sélection aléatoire au chargement puis défilement toutes les 3.8 secondes
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Initialiser avec un index aléatoire parmi les 30 images
    const initialIndex = Math.floor(Math.random() * MOCKUP_SHOWCASE_IMAGES.length);
    setCurrentIndex(initialIndex);

    // Rotation toutes les 3.8 secondes (3800 ms) pour une présentation vive et dynamique
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

          <a href="#pricing" className="landing-btn-secondary">
            <span>Voir les tarifs</span>
          </a>
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
              {/* Slideshow des 20 images */}
              {MOCKUP_SHOWCASE_IMAGES.map((img, idx) => {
                const isActive = idx === currentIndex;
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
                      loading={idx === 0 ? 'eager' : 'lazy'}
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
    </section>
  );
}


