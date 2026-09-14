import LandingNavbar from '@/components/LandingNavbar';
import LandingHero from '@/components/LandingHero';
import LandingFeatures from '@/components/LandingFeatures';
import LandingHowItWorks from '@/components/LandingHowItWorks';
import LandingPricing from '@/components/LandingPricing';
import LandingFAQ from '@/components/LandingFAQ';
import LandingCallout from '@/components/LandingCallout';
import LandingFooter from '@/components/LandingFooter';
import ScrollReveal from '@/components/ScrollReveal';
import LandingScrollInstallPrompt from '@/components/LandingScrollInstallPrompt';

export const metadata = {
  title: 'PIXAXIS — Créez des images IA en un clic | Afrique de l’Ouest',
  description: 'Générateur d’images par IA pour l’Afrique de l’Ouest : logos, affiches publicitaires, bannières, avatars et packshots produits. Tarifs clairs en FCFA sans abonnement.',
};

export default function Home() {
  return (
    <div className="landing-wrapper">
      <ScrollReveal />
      <LandingNavbar />
      <main>
        <LandingHero />
        <LandingFeatures />
        <LandingHowItWorks />
        <LandingPricing />
        <LandingFAQ />
        <LandingCallout />
      </main>
      <LandingFooter />
      <LandingScrollInstallPrompt />
    </div>
  );
}
