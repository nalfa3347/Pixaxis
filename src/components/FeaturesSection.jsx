import React from 'react';

export default function FeaturesSection() {
  const features = [
    {
      title: 'Simplicité ultra‑rapide',
      description: "Importez ou choisissez jusqu’à 10 références, le tout en moins de 3 s.",
    },
    {
      title: 'Qualité premium',
      description: "Résultats photo‑réalistes, minimalistes ou 3D selon votre style.",
    },
    {
      title: 'Gestion de crédits claire',
      description: "Pas d’abonnement, achetez les packs qui vous conviennent.",
    },
  ];

  return (
    <section className="features-section" style={{ padding: 'var(--space-3xl) var(--space-lg)', textAlign: 'center' }}>
      <h2 className="section-title" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-xl)' }}>Fonctionnalités</h2>
      <div className="features-grid" style={{ display: 'grid', gap: 'var(--space-xl)', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {features.map((f, i) => (
          <div key={i} className="feature-card card" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' }}>{f.title}</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
