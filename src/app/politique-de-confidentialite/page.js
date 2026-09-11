import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

export const metadata = {
  title: 'Politique de Confidentialité — PIXAXIS',
  description: 'Politique de confidentialité et protection des données personnelles et images sur PIXAXIS.',
};

export default function PolitiqueConfidentialitePage() {
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
              <span>PROTECTION DES DONNÉES</span>
            </div>
            <h1 className="legal-header__title">Politique de Confidentialité</h1>
            <p className="legal-header__meta">En vigueur dès 2026 • Plateforme PIXAXIS</p>
          </header>

          <div className="legal-content">
            {/* Section 1: Engagement */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">01.</span> Engagement de Confidentialité
              </h2>
              <p>
                Chez <strong>PIXAXIS</strong>, la confidentialité de vos créations, de vos photos de référence et de vos informations personnelles est une priorité absolue. Nous appliquons une politique de transparence stricte : <strong>aucune donnée ni image n'est vendue, louée ou cédée à des tiers</strong>.
              </p>
            </article>

            {/* Section 2: Données collectées */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">02.</span> Données Collectées et Utilité
              </h2>
              <p>
                Nous ne collectons que le strict minimum nécessaire au fonctionnement du studio :
              </p>
              <ul>
                <li><strong>Identifiant & Compte :</strong> Votre adresse email pour vous identifier et vous connecter depuis n'importe quel appareil (mobile ou ordinateur).</li>
                <li><strong>Images importées :</strong> Les photos que vous importez pour servir de référence (compressées automatiquement et liées à votre compte).</li>
                <li><strong>Historique des créations :</strong> Les images générées par l'IA afin que vous puissiez les retrouver et les télécharger à tout moment.</li>
                <li><strong>Transactions de crédits :</strong> L'historique de vos achats pour la gestion transparente de vos lots de crédits FEFO.</li>
              </ul>
            </article>

            {/* Section 3: Sécurité et Chiffrement */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">03.</span> Sécurité et Stockage Cloud
              </h2>
              <p>
                Toutes vos données et images sont stockées dans une infrastructure cloud haute sécurité (Supabase Cloud PostgreSQL et Storage chiffré).
              </p>
              <ul>
                <li><strong>Isolation stricte (RLS) :</strong> Des politiques de sécurité au niveau ligne (Row Level Security) garantissent que chaque utilisateur ne peut accéder qu'à ses propres images et données.</li>
                <li><strong>Chiffrement des flux :</strong> Toutes les communications transitent sous protocole sécurisé SSL/TLS HTTPS.</li>
              </ul>
            </article>

            {/* Section 4: Contrôle et Suppression */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">04.</span> Vos Droits & Suppression Totale
              </h2>
              <p>
                Vous conservez le contrôle total sur vos contenus :
              </p>
              <ul>
                <li><strong>Téléchargement libre :</strong> Vous pouvez enregistrer vos images créées en haute définition à tout moment dans votre galerie ou sur votre PC.</li>
                <li><strong>Suppression instantanée :</strong> Vous pouvez supprimer définitivement n'importe quelle photo importée depuis la rubrique "Mes images" (le fichier physique et la ligne de base de données sont immédiatement détruits).</li>
                <li><strong>Suppression de compte :</strong> Vous pouvez demander la suppression intégrale de votre compte et de toutes ses données associées sur simple demande écrite.</li>
              </ul>
            </article>

            {/* Section 5: Contact DPD */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">05.</span> Contact Données Personnelles
              </h2>
              <p>
                Pour exercer vos droits d'accès, de rectification ou de suppression définitive :
              </p>
              <div className="legal-highlight-box">
                ✉️ <strong>Email direct :</strong> <a href="mailto:nasserpillar4@gmail.com" style={{ color: 'inherit' }}>nasserpillar4@gmail.com</a><br />
                📞 <strong>Téléphone / WhatsApp :</strong> <a href="tel:+22892880010" style={{ color: 'inherit' }}>+228 92 88 00 10</a>
              </div>
            </article>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
