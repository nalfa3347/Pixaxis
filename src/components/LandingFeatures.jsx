import React from 'react';

export default function LandingFeatures() {
  const features = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
      title: '5 Formats',
      description: 'Logos, affiches, bannières, avatars et pubs.',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z" />
        </svg>
      ),
      title: '3 Styles',
      description: 'Réaliste, minimaliste ou illustration 3D.',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      ),
      title: 'Moins de 3s',
      description: 'Rendu ultra-rapide optimisé pour mobile.',
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      ),
      title: '3 Références',
      description: 'Produit, logo et ambiance pour guider l’IA.',
    },
  ];

  return (
    <section className="landing-section" id="features">
      <div className="landing-section__inner">
        <div className="landing-section__header">
          <div className="landing-badge">
            <span>FONCTIONNALITÉS</span>
          </div>
          <h2 className="landing-section__title">
            Fonctionnalités clés.
          </h2>
          <p className="landing-section__subtitle">
            L'essentiel pour vos créations au quotidien.
          </p>
        </div>

        <div className="landing-features-grid">
          {features.map((feature, index) => (
            <div key={index} className="landing-feature-card">
              <div className="landing-feature-card__icon-wrap">
                {feature.icon}
              </div>
              <h3 className="landing-feature-card__title">
                {feature.title}
              </h3>
              <p className="landing-feature-card__desc">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
