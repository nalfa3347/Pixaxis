import Link from 'next/link';
import LogoPX from './LogoPX';

export default function LandingFooter() {
  return (
    <footer className="landing-footer" id="contact" role="contentinfo">
      <div className="landing-footer__grid">
        {/* Column 1: Brand */}
        <div className="landing-footer__brand-col">
          <LogoPX size={34} withText={true} />
          <p className="landing-footer__tagline">
            Création d'images professionnelles par IA pour l'Afrique de l'Ouest.
          </p>
        </div>

        {/* Column 2: Produit */}
        <div>
          <h3 className="landing-footer__col-title">Produit</h3>
          <ul className="landing-footer__links">
            <li>
              <a href="#features" className="landing-footer__link">
                Fonctionnalités
              </a>
            </li>
            <li>
              <a href="#how-it-works" className="landing-footer__link">
                Comment ça marche
              </a>
            </li>
            <li>
              <a href="#pricing" className="landing-footer__link">
                Tarifs des crédits
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3: Ressources & Support */}
        <div>
          <h3 className="landing-footer__col-title">Ressources & Support</h3>
          <ul className="landing-footer__links">
            <li>
              <a href="#faq" className="landing-footer__link">
                Questions fréquentes (FAQ)
              </a>
            </li>
            <li className="landing-footer__contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <span>
                Email direct :<br />
                <a href="mailto:nasserpillar4@gmail.com" className="landing-footer__contact-link">
                  nasserpillar4@gmail.com
                </a>
              </span>
            </li>
            <li className="landing-footer__contact-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '2px' }}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>
                Téléphone & WhatsApp :<br />
                <a href="tel:+22892880010" className="landing-footer__contact-link">
                  +228 92 88 00 10
                </a>
              </span>
            </li>
          </ul>
        </div>

        {/* Column 4: Légal & Confidentialité */}
        <div>
          <h3 className="landing-footer__col-title">Légal & Confidentialité</h3>
          <ul className="landing-footer__links">
            <li>
              <Link href="/mentions-legales" className="landing-footer__link">
                Mentions Légales
              </Link>
            </li>
            <li>
              <Link href="/cgu" className="landing-footer__link">
                Conditions d'Utilisation (CGU)
              </Link>
            </li>
            <li>
              <Link href="/politique-de-confidentialite" className="landing-footer__link">
                Politique de Confidentialité
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="landing-footer__bottom">
        <div>
          © 2026 PIXAXIS. Tous droits réservés.
        </div>
        <div className="landing-footer__bottom-contacts">
          <span>Support direct :</span>
          <a href="tel:+22892880010">+228 92 88 00 10</a>
          <span>•</span>
          <a href="mailto:nasserpillar4@gmail.com">nasserpillar4@gmail.com</a>
        </div>
      </div>
    </footer>
  );
}
