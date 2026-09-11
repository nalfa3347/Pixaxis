import React from 'react';

export default function HowItWorksSection() {
  const steps = [
    { title: 'Choisissez vos références', description: 'Importez ou sélectionnez depuis votre galerie.' },
    { title: 'Sélectionnez type, style, format', description: '5 types, 3 styles, 3 formats disponibles.' },
    { title: 'Générez', description: 'Un aperçu apparaît en quelques secondes.' },
    { title: 'Téléchargez', description: 'Enregistrez directement sur votre appareil.' },
  ];

  return (
    <section className="how-it-works-section" style={{ padding: 'var(--space-3xl) var(--space-lg)', textAlign: 'center' }}>
      <h2 className="section-title" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-xl)' }}>Comment ça fonctionne</h2>
      <div className="steps-grid" style={{ display: 'grid', gap: 'var(--space-xl)', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {steps.map((s, i) => (
          <div key={i} className="step-card card" style={{ padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ color: 'var(--color-text-primary)', marginBottom: 'var(--space-sm)' }}>{s.title}</h3>
            <p style={{ color: 'var(--color-text-secondary)' }}>{s.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
