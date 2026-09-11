import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

export const metadata = {
  title: "Conditions Générales d'Utilisation (CGU) — PIXAXIS",
  description: "Conditions générales d'utilisation régissant le service et les crédits de génération d'images PIXAXIS.",
};

export default function CGUPage() {
  return (
    <div className="landing-wrapper">
      <LandingNavbar />

      <main className="legal-page">
        <div className="legal-container">
          <Link href="/" className="legal-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Retour à l'accueil</span>
          </Link>

          <header className="legal-header">
            <div className="landing-badge">
              <span>CONDITIONS DU SERVICE</span>
            </div>
            <h1 className="legal-header__title">Conditions Générales d'Utilisation (CGU)</h1>
            <p className="legal-header__meta">En vigueur dès 2026 • Plateforme PIXAXIS</p>
          </header>

          <div className="legal-content">
            {/* Section 1: Objet */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">01.</span> Objet du Service
              </h2>
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) encadrent l'accès et l'utilisation de la plateforme web <strong>PIXAXIS</strong>. Le service met à disposition des utilisateurs un moteur assisté par intelligence artificielle pour concevoir rapidement des visuels de qualité professionnelle (logos, affiches publicitaires, bannières, avatars, packshots produits).
              </p>
            </article>

            {/* Section 2: Modèle de crédits */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">02.</span> Modèle de Crédits Sans Abonnement
              </h2>
              <p>
                PIXAXIS fonctionne sur un modèle transparent d'achat de crédits à l'acte, sans aucun abonnement récurrent ni prélèvement automatique bancaire :
              </p>
              <ul>
                <li><strong>Découverte (1 000 FCFA) :</strong> 1 000 crédits (5 images, 200 crédits/image) • Validité 30 jours.</li>
                <li><strong>Créateur (3 000 FCFA) :</strong> 3 060 crédits (17 images dont 1 bonus, 180 crédits/image) • Validité 3 mois.</li>
                <li><strong>Professionnel (5 000 FCFA) :</strong> 5 120 crédits (32 images dont 1 bonus, 160 crédits/image) • Validité 6 mois.</li>
                <li><strong>Studio (15 000 FCFA) :</strong> 15 000 crédits (100 images, 150 crédits/image) • Validité 1 an.</li>
              </ul>
              <div className="legal-highlight-box">
                🛡️ <strong>Règle de protection FEFO :</strong> Vos crédits les plus anciens ou les plus proches de leur date limite sont automatiquement consommés en premier. Vos nouveaux achats ne sont entamés qu'après épuisement des anciens.<br /><br />
                ⚡ <strong>Garantie de non-débit sur échec :</strong> Aucun crédit n'est déduit si la génération échoue ou si le serveur rencontre un imprévu.
              </div>
            </article>

            {/* Section 3: Règles de génération et contenu */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">03.</span> Utilisation Acceptable et Contenus
              </h2>
              <p>
                L'utilisateur s'engage à utiliser le service de manière responsable et dans le strict respect de la législation :
              </p>
              <ul>
                <li><strong>Images de référence :</strong> L'utilisateur peut importer jusqu'à 10 photos pour guider l'IA, sous réserve d'en détenir les droits ou autorisations.</li>
                <li><strong>Contenus strictement prohibés :</strong> Génération de contenus violents, discriminatoires, illégaux, pornographiques ou portant atteinte à l'ordre public.</li>
                <li><strong>Sanction :</strong> Tout compte contrevenant à ces règles fera l'objet d'une suspension immédiate sans remboursement.</li>
              </ul>
            </article>

            {/* Section 4: Propriété des créations */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">04.</span> Propriété Commerciale des Visuels
              </h2>
              <p>
                Toute image générée avec succès sur votre compte vous appartient à 100%. Vous disposez du droit irrévocable de l'exploiter pour vos marques, supports imprimés, réseaux sociaux, publicités ou commerces sans redevance additionnelle.
              </p>
            </article>

            {/* Section 5: Disponibilité & Support */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">05.</span> Support Client Direct
              </h2>
              <p>
                Pour toute assistance technique, signalement ou question relative à votre compte :
              </p>
              <div className="legal-highlight-box">
                📞 <strong>Téléphone / WhatsApp :</strong> <a href="tel:+22892880010" style={{ color: 'inherit' }}>+228 92 88 00 10</a><br />
                ✉️ <strong>Email support :</strong> <a href="mailto:nasserpillar4@gmail.com" style={{ color: 'inherit' }}>nasserpillar4@gmail.com</a>
              </div>
            </article>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
