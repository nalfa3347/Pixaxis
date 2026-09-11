import Link from 'next/link';
import LandingNavbar from '@/components/LandingNavbar';
import LandingFooter from '@/components/LandingFooter';

export const metadata = {
  title: 'Mentions Légales — PIXAXIS',
  description: 'Mentions légales, coordonnées et informations administratives du service PIXAXIS.',
};

export default function MentionsLegalesPage() {
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
              <span>CADRE LÉGAL</span>
            </div>
            <h1 className="legal-header__title">Mentions Légales</h1>
            <p className="legal-header__meta">Dernière mise à jour : 2026 • Service PIXAXIS</p>
          </header>

          <div className="legal-content">
            {/* Section 1: Éditeur */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">01.</span> Éditeur et Responsable du Service
              </h2>
              <p>
                La plateforme et marque <strong>PIXAXIS</strong> est un service numérique spécialisé dans la conception et la génération d'images assistée par intelligence artificielle pour les créateurs, commerçants et professionnels d'Afrique de l'Ouest.
              </p>
              <ul>
                <li><strong>Nom du service :</strong> PIXAXIS</li>
                <li><strong>Responsable de publication :</strong> Direction du service numérique PIXAXIS</li>
                <li><strong>Téléphone direct & WhatsApp :</strong> <a href="tel:+22892880010" style={{ color: 'var(--color-accent)' }}>+228 92 88 00 10</a></li>
                <li><strong>Email de contact officiel :</strong> <a href="mailto:nasserpillar4@gmail.com" style={{ color: 'var(--color-accent)' }}>nasserpillar4@gmail.com</a></li>
                <li><strong>Siège & Zone d'activité :</strong> Lomé, Togo — Afrique de l'Ouest</li>
              </ul>
            </article>

            {/* Section 2: Hébergement et Sécurité */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">02.</span> Hébergement et Infrastructure Technique
              </h2>
              <p>
                L'infrastructure de PIXAXIS repose sur des standards de haute disponibilité assurant un chargement rapide en moins de 3 secondes :
              </p>
              <ul>
                <li><strong>Hébergement applicatif :</strong> Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723.</li>
                <li><strong>Base de données & Stockage Cloud :</strong> Supabase Inc., infrastructure PostgreSQL sécurisée avec chiffrement au repos et Row Level Security (RLS).</li>
                <li><strong>Réseau de distribution (CDN) :</strong> Distribution globale optimisée pour les réseaux mobiles et connexions ouest-africaines.</li>
              </ul>
            </article>

            {/* Section 3: Propriété Intellectuelle et Droits d'Auteur */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">03.</span> Propriété Intellectuelle & Droits Commerciaux
              </h2>
              <p>
                <strong>Vos créations vous appartiennent :</strong> Chaque utilisateur dispose de l'entière propriété et de la licence d'exploitation commerciale libre et illimitée sur toutes les images qu'il génère avec succès sur PIXAXIS (logos, bannières, affiches, packshots).
              </p>
              <p>
                Les éléments constitutifs de la plateforme (nom, identité visuelle, interface graphique, code source et algorithmes internes d'optimisation de prompts) demeurent la propriété exclusive de PIXAXIS et sont protégés par les lois relatives à la propriété intellectuelle.
              </p>
            </article>

            {/* Section 4: Contact & Réclamations */}
            <article className="legal-card">
              <h2 className="legal-card__title">
                <span className="legal-card__title-accent">04.</span> Assistance et Contact
              </h2>
              <p>
                Pour toute question relative aux mentions légales ou pour toute demande d'assistance technique ou de facturation :
              </p>
              <div className="legal-highlight-box">
                📞 <strong>Téléphone / WhatsApp :</strong> <a href="tel:+22892880010" style={{ color: 'inherit' }}>+228 92 88 00 10</a><br />
                ✉️ <strong>Email officiel :</strong> <a href="mailto:nasserpillar4@gmail.com" style={{ color: 'inherit' }}>nasserpillar4@gmail.com</a>
              </div>
            </article>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
