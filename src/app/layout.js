import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import AppLayoutShell from '@/components/AppLayoutShell';
import { PixaxisProvider } from '@/context/PixaxisContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-heading',
  display: 'swap',
});

export const metadata = {
  title: 'PIXAXIS — Créez des images par IA',
  description: 'Application de création d\'images par intelligence artificielle. Créez des logos, affiches, bannières et plus encore en quelques clics.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PIXAXIS',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${inter.variable} ${outfit.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var isStandalone = (window.matchMedia && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    )) || window.navigator.standalone === true || (document.referrer && document.referrer.indexOf('android-app://') !== -1);
    
    if (isStandalone) {
      document.documentElement.classList.add('is-standalone-app');
      if (window.location.pathname === '/') {
        window.location.replace('/connexion');
      }
    }
  } catch (e) {}
})();
`,
          }}
        />
      </head>
      <body>
        <PixaxisProvider>
          <AppLayoutShell>
            {children}
          </AppLayoutShell>
        </PixaxisProvider>
      </body>
    </html>
  );
}
