import Image from 'next/image';
import styles from '@/app/globals.css';

export default function HeroSection() {
  return (
    <section className="hero-section" style={{ backgroundImage: "url('/images/hero-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="hero-content" style={{ padding: '4rem', textAlign: 'center' }}>
        <h1 className="hero-title" style={{ color: 'var(--color-accent)', fontSize: 'var(--text-4xl)', marginBottom: '1rem' }}>
          PIXAXIS – Créez des images IA en un clic
        </h1>
        <p className="hero-subtitle" style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-lg)', marginBottom: '2rem' }}>
          Des visuels professionnels, instantanés, à portée de main pour l’Afrique de l’Ouest.
        </p>
        <a href="/connexion?redirect=/creer" className="btn btn--primary btn--large">
          Commencer maintenant
        </a>
      </div>
    </section>
  );
}
