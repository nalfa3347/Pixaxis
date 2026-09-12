import './globals.css';
import AppLayoutShell from '@/components/AppLayoutShell';
import { PixaxisProvider } from '@/context/PixaxisContext';

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
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700&display=swap"
        />
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
