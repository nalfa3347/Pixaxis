'use client';

import Link from 'next/link';

export default function LandingCallout() {
  return (
    <section className="landing-callout" aria-label="Section d'action">
      <div className="landing-callout__card">
        <h2 className="landing-callout__title">
          Prêt à créer vos visuels ?
        </h2>
        <p className="landing-callout__desc">
          Générez vos logos, affiches et pubs dès maintenant.
        </p>
        <Link href="/connexion?redirect=/creer" className="landing-callout__btn">
          <span>Commencer maintenant</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
        <div className="landing-callout__micro">
          Sans abonnement • Paiement FCFA
        </div>
      </div>
    </section>
  );
}
