import React from 'react';

export default function LandingHowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Vos choix',
      description: 'Choisissez format, style et type.',
    },
    {
      number: '2',
      title: 'Rendu IA',
      description: 'L’IA génère votre visuel HD en quelques secondes.',
    },
    {
      number: '3',
      title: 'Enregistrez',
      description: 'Téléchargez directement sur votre mobile ou PC.',
    },
  ];

  return (
    <section className="landing-section" id="how-it-works">
      <div className="landing-section__inner">
        <div className="landing-section__header">
          <div className="landing-badge">
            <span>COMMENT ÇA MARCHE</span>
          </div>
          <h2 className="landing-section__title">
            Simple comme 1, 2, 3.
          </h2>
          <p className="landing-section__subtitle">
            De votre idée à l'image HD en 3 étapes.
          </p>
        </div>

        <div className="landing-steps-grid">
          {steps.map((step, index) => (
            <div key={index} className="landing-step-card">
              <div className="landing-step-card__number">
                {step.number}
              </div>
              <h3 className="landing-step-card__title">
                {step.title}
              </h3>
              <p className="landing-step-card__desc">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
