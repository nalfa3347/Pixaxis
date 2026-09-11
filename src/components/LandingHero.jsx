'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// 20 images hyper-réalistes générées pour le studio PIXAXIS (thèmes variés + forte mise en avant produits)
const MOCKUP_SHOWCASE_IMAGES = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Célébration festive anniversaire avec gâteau et étincelles',
    title: 'Fête Anniversaire',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Cérémonie de remise des diplômes toge et mortier',
    title: 'Remise des Diplômes',
    type: 'Avatar',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Groupe de jeunes basketteurs sur terrain urbain',
    title: 'Équipe Basketteurs',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 4,
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Groupe de jeunes leaders et entrepreneurs en réunion',
    title: 'Sommet des Leaders',
    type: 'Affiche',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 5,
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Femme noire élégante avec soin et cosmétique de luxe',
    title: 'Cosmétique Skincare',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 6,
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Vue lumineuse plage tropicale et ambiance estivale',
    title: 'Saison Balnéaire',
    type: 'Bannière',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 7,
    url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Packshot parfum noir et or luxe',
    title: 'Parfum Black Orchid',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 8,
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Logo géométrique 3D néon cyan',
    title: 'Monogramme 3D Néon',
    type: 'Logo',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 9,
    url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Packshot sneaker futuriste néon',
    title: 'Sneaker Cyberpunk',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 10,
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Packshot boisson canette splash',
    title: 'Canette Splash Drink',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 11,
    url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Montre chronographe de luxe titane',
    title: 'Chronomètre Titane',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 12,
    url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Bague solitaire diamant et or',
    title: 'Bague Solitaire Diamant',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 13,
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Casque audio haute fidélité studio',
    title: 'Casque Studio Hi-Fi',
    type: 'Pub Produit',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 14,
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Monogramme 3D typographique or',
    title: 'Monogramme Or Sculpté',
    type: 'Logo',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 15,
    url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Flacon sérum soin visage gouttes',
    title: 'Sérum Éclat Skincare',
    type: 'Pub Produit',
    style: 'Réaliste',
    format: '1:1',
  },
  {
    id: 16,
    url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Lunettes solaires luxe noir et or',
    title: 'Lunettes Solaires Noir & Or',
    type: 'Pub Produit',
    style: 'Minimaliste',
    format: '1:1',
  },
  {
    id: 17,
    url: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Sphère abstraite 3D chrome et cyan',
    title: 'Sculpture Chrome & Cyan',
    type: 'Logo',
    style: '3D Moderne',
    format: '1:1',
  },
  {
    id: 18,
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Affiche de design architectural sombre',
    title: 'Poster Minimaliste',
    type: 'Affiche',
    style: 'Minimaliste',
    format: '1:1',
  },
  {
    id: 19,
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Bannière circuit cyber minimaliste',
    title: 'Circuit Cyber Minimal',
    type: 'Bannière',
    style: 'Minimaliste',
    format: '1:1',
  },
  {
    id: 20,
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=600&h=600&fit=crop&auto=format&q=80',
    alt: 'Fluide cyan iridescent abstrait',
    title: 'Onde Fluide Cyan',
    type: 'Bannière',
    style: '3D Moderne',
    format: '1:1',
  },
];

export default function LandingHero() {
  // Sélection aléatoire au chargement puis défilement toutes les 5 secondes
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Initialiser avec un index aléatoire parmi les 20 images
    const initialIndex = Math.floor(Math.random() * MOCKUP_SHOWCASE_IMAGES.length);
    setCurrentIndex(initialIndex);

    // Rotation toutes les 5 secondes (5000 ms)
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % MOCKUP_SHOWCASE_IMAGES.length);
    }, 5000);

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

              {/* Tag indicateur en haut à droite — sans affichage du nombre d'images */}
              <div className="landing-mockup__top-badge">
                <span className="landing-mockup__pulse-dot" />
                <span>IA Active</span>
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


