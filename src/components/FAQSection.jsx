import React, { useState } from 'react';

export default function FAQSection() {
  const faqItems = [
    {
      question: 'Comment sont calculés les crédits ?',
      answer: 'Chaque génération consomme un nombre fixe de crédits selon le type choisi.',
    },
    {
      question: 'Les images sont‑elles stockées ?',
      answer: 'Oui, dans Supabase ; vous les retrouvez sur tous vos appareils.',
    },
    {
      question: 'Puis‑je annuler une génération ?',
      answer: 'Le crédit n’est débité que si l’API renvoie une image.',
    },
  ];

  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="faq-section" style={{ padding: 'var(--space-3xl) var(--space-lg)', textAlign: 'center' }}>
      <h2 className="section-title" style={{ color: 'var(--color-accent)', marginBottom: 'var(--space-xl)' }}>FAQ</h2>
      <div className="faq-list" style={{ maxWidth: '800px', margin: '0 auto' }}>
        {faqItems.map((item, i) => (
          <div key={i} className="faq-item" style={{ marginBottom: 'var(--space-md)' }}>
            <button
              className="faq-question btn btn--ghost"
              style={{ width: '100%', textAlign: 'left', padding: 'var(--space-sm)', fontWeight: 'var(--weight-medium)' }}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              {item.question}
            </button>
            {openIndex === i && (
              <div className="faq-answer" style={{ padding: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
