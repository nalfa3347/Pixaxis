'use client';

import Link from 'next/link';
import { CREDIT_PACKS } from '@/config/constants';

export default function LandingPricing() {
  return (
    <section className="landing-section" id="pricing">
      <div className="landing-section__inner">
        <div className="landing-section__header">
          <div className="landing-badge">
            <span>TARIFS EN FCFA</span>
          </div>
          <h2 className="landing-section__title">
            Tarifs simples & transparents.
          </h2>
          <p className="landing-section__subtitle">
            Packs de crédits sans abonnement. Choisissez selon votre besoin en images.
          </p>
        </div>

        <div className="landing-pricing-grid">
          {CREDIT_PACKS.map((pack) => {
            const isPopular = pack.popular;
            const imagesNum = pack.id === 'decouverte' ? '5' : pack.id === 'createur' ? '17' : pack.id === 'professionnel' ? '32' : '100';

            return (
              <div 
                key={pack.id} 
                className={`landing-pricing-card ${isPopular ? 'landing-pricing-card--popular' : ''}`}
              >
                {/* Popular / Recommended Badge */}
                {isPopular && (
                  <div className="landing-pricing-card__badge-popular">
                    RECOMMANDÉ
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="landing-pricing-card__header">
                    <h3 className="landing-pricing-card__name">
                      {pack.name}
                    </h3>
                  </div>

                  {/* Price Box */}
                  <div className="landing-pricing-card__price-box">
                    <div className="landing-pricing-card__price">
                      {pack.price_fcfa.toLocaleString('fr-FR')} FCFA
                    </div>
                  </div>

                  {/* MISE EN AVANT MAJEURE : NOMBRE D'IMAGES */}
                  <div className="landing-pricing-card__images-block">
                    <div className="landing-pricing-card__images-headline">
                      <span className="landing-pricing-card__images-big">{imagesNum}</span>
                      <span className="landing-pricing-card__images-suffix">IMAGES HD</span>
                    </div>
                    {pack.bonus_text ? (
                      <div className="landing-pricing-card__bonus-pill">
                        🎁 {pack.bonus_text}
                      </div>
                    ) : (
                      <div className="landing-pricing-card__sub-rate">
                        {pack.cost_per_generation} crédits / génération
                      </div>
                    )}
                  </div>

                  {/* MISE EN AVANT MAJEURE : VALIDITÉ DES CRÉDITS */}
                  <div className="landing-pricing-card__validity-pill">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>Validité : <strong>{pack.validity_label}</strong></span>
                  </div>

                  {/* Feature list ultra-courte (2 points) */}
                  <ul className="landing-pricing-card__features">
                    <li className="landing-pricing-card__feature-item">
                      <span className="landing-pricing-card__check-icon">✓</span>
                      <span>Rendu IA Studio 1024×1024</span>
                    </li>
                    <li className="landing-pricing-card__feature-item">
                      <span className="landing-pricing-card__check-icon">✓</span>
                      <span>Téléchargement sans filigrane</span>
                    </li>
                  </ul>
                </div>

                {/* Purchase Button -> Redirige vers la page de connexion */}
                <Link
                  href={`/connexion?redirect=/profil?pack=${pack.id}`}
                  className={`landing-pricing-card__cta-btn ${
                    isPopular 
                      ? 'landing-pricing-card__cta-btn--primary' 
                      : 'landing-pricing-card__cta-btn--secondary'
                  }`}
                >
                  Choisir ce pack ({imagesNum} images)
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
