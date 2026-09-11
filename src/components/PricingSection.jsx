import React from 'react';

export default function PricingSection() {
  const packs = [
    { credits: 30, price: '1 000 FCFA', validity: '3 mois' },
    { credits: 100, price: '3 000 FCFA', validity: '3 mois' },
    { credits: 180, price: '5 000 FCFA', validity: '3 mois' },
    { credits: 600, price: '15 000 FCFA', validity: '3 mois' },
  ];

  return (
    <section className="pricing-section" style={{ padding: 'var(--space-3xl) var(--space-lg)', textAlign: 'center' }}>
      <h2 className="section-title" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-xl)' }}>Tarifs</h2>
      <div className="pricing-grid" style={{ display: 'grid', gap: 'var(--space-xl)', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {packs.map((p, i) => (
          <div key={i} className="credit-pack card" style={{ padding: 'var(--space-xl)', borderRadius: 'var(--radius-xl)' }}>
            <div className="credit-pack__credits" style={{ color: 'var(--color-accent)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-sm)' }}>{p.credits} crédits</div>
            <div className="credit-pack__price" style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-sm)' }}>{p.price}</div>
            <div className="credit-pack__validity" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{p.validity}</div>
            <button className="btn btn--primary" style={{ marginTop: 'var(--space-md)' }}>Acheter</button>
          </div>
        ))}
      </div>
    </section>
  );
}
