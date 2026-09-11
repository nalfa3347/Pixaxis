'use client';

import { useState } from 'react';

export default function LandingFAQ() {
  const faqItems = [
    {
      question: 'Comment sont déduits les crédits ?',
      answer: 'Vos crédits sont débités uniquement si la génération réussit.',
    },
    {
      question: 'Combien de temps sont valables mes crédits ?',
      answer: 'De 30 jours à 1 an selon le pack, sans reconduction tacite.',
    },
    {
      question: 'Puis-je utiliser les images pour mon commerce ?',
      answer: 'Oui, toutes les images générées incluent les droits commerciaux.',
    },
    {
      question: 'Quels paiements sont acceptés ?',
      answer: 'Mobile Money (T-Money, Flooz, Wave, Orange, MTN) et cartes en FCFA.',
    },
  ];

  const [openIndex, setOpenIndex] = useState(0);

  const toggleItem = (index) => {
    setOpenIndex(openIndex === index ? -1 : index);
  };

  return (
    <section className="landing-section" id="faq">
      <div className="landing-section__inner">
        <div className="landing-section__header">
          <div className="landing-badge">
            <span>FAQ</span>
          </div>
          <h2 className="landing-section__title">
            Questions fréquentes.
          </h2>
          <p className="landing-section__subtitle">
            Tout ce qu'il faut savoir sur PIXAXIS.
          </p>
        </div>

        <div className="landing-faq-container">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div 
                key={index} 
                className={`landing-faq-item ${isOpen ? 'landing-faq-item--open' : ''}`}
              >
                <button
                  type="button"
                  className="landing-faq-question"
                  onClick={() => toggleItem(index)}
                  aria-expanded={isOpen}
                >
                  <span>{item.question}</span>
                  <svg 
                    className="landing-faq-icon" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="landing-faq-answer">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
