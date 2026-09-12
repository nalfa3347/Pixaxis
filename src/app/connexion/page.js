'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LogoPX from '@/components/LogoPX';
import { supabase } from '@/lib/supabase-client';

// Liste des indicatifs téléphoniques les plus courants en Afrique de l'Ouest et zone Francophone
const COUNTRY_CODES = [
  { code: '+225', label: '+225 (Côte d\'Ivoire)' },
  { code: '+228', label: '+228 (Togo)' },
  { code: '+229', label: '+229 (Bénin)' },
  { code: '+221', label: '+221 (Sénégal)' },
  { code: '+226', label: '+226 (Burkina Faso)' },
  { code: '+223', label: '+223 (Mali)' },
  { code: '+227', label: '+227 (Niger)' },
  { code: '+224', label: '+224 (Guinée)' },
  { code: '+237', label: '+237 (Cameroun)' },
  { code: '+33', label: '+33 (France)' },
];

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/creer';

  // Vérification de validité réelle du compte auprès de Supabase
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (!error && user) {
        // Vérifier si l'utilisateur a complété son parcours d'onboarding
        const { data: prof } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', user.id)
          .maybeSingle();

        if (prof && prof.has_completed_onboarding === false) {
          router.replace('/onboarding');
        } else {
          router.replace(redirectUrl);
        }
      } else {
        // Si aucun utilisateur valide sur le serveur (ex: comptes de test supprimés), purger la session locale
        supabase.auth.signOut().catch(() => {});
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pixaxis_user_id');
          localStorage.removeItem('pixaxis_user_name');
          localStorage.removeItem('pixaxis_user_phone');
        }
      }
    }).catch(() => {});
  }, [router, redirectUrl]);

  // Mode : 'signin' (Se connecter en premier par défaut) ou 'signup' (Créer un compte)
  const [mode, setMode] = useState('signin');
  // Méthode : 'phone' (Téléphone) ou 'email' (Email)
  const [method, setMethod] = useState('phone');

  // Champs de saisie
  const [countryCode, setCountryCode] = useState('+225');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // État de chargement et retours d'information
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validation des champs
    if (method === 'phone') {
      const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      if (!cleanPhone || cleanPhone.length < 6) {
        setErrorMsg('Veuillez saisir un numéro de téléphone valide.');
        return;
      }
    } else {
      if (!email.trim() || !email.includes('@')) {
        setErrorMsg('Veuillez saisir une adresse email valide.');
        return;
      }
    }

    if (!password || password.length < 6) {
      setErrorMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      const fullPhone = method === 'phone' 
        ? `${countryCode}${phoneNumber.trim().replace(/\s+/g, '').replace(/^0+/, '')}`
        : null;

      // 1. Appel API serveur pour enregistrement / validation
      const authRes = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          method,
          phone: fullPhone,
          email: method === 'email' ? email.trim() : null,
          password,
          fullName: fullName.trim() || undefined,
        }),
      });

      const authData = await authRes.json();

      if (!authRes.ok || authData.error) {
        throw new Error(authData.error || 'Erreur lors du traitement de votre demande.');
      }

      const targetEmail = authData.targetEmail;

      // 2. Connexion du client Supabase pour session JWT locale
      if (authData.alreadyExists) {
        const loginRes = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (loginRes.error) {
          setMode('signin');
          throw new Error('Ce compte existe déjà. Veuillez vérifier votre mot de passe et vous connecter.');
        }
      } else {
        const loginRes = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password: password,
        });

        if (loginRes.error) {
          if (loginRes.error.message?.includes('Invalid login credentials')) {
            throw new Error('Mot de passe ou identifiant incorrect.');
          }
          throw loginRes.error;
        }
      }

      // 3. Sauvegarde locale du profil pour synchronisation immédiate
      if (typeof window !== 'undefined') {
        if (authData.userId) {
          localStorage.setItem('pixaxis_user_id', authData.userId);
        }
        if (fullName.trim()) {
          localStorage.setItem('pixaxis_user_name', fullName.trim());
        }
        if (fullPhone) {
          localStorage.setItem('pixaxis_user_phone', fullPhone);
        }
      }

      setSuccessMsg(
        mode === 'signup'
          ? 'Compte créé avec succès ! Préparation de votre parcours...'
          : 'Connexion réussie ! Redirection en cours...'
      );

      // 4. Redirection vers l'onboarding (pour les nouveaux) ou le studio (pour les anciens ayant complété l'onboarding)
      let targetDestination = redirectUrl;
      if (mode === 'signup' || authData.isNewUser) {
        targetDestination = '/onboarding';
      } else {
        const { data: prof } = await supabase
          .from('profiles')
          .select('has_completed_onboarding')
          .eq('id', authData.userId || (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();

        if (prof && prof.has_completed_onboarding === false) {
          targetDestination = '/onboarding';
        }
      }

      setTimeout(() => {
        router.push(targetDestination);
      }, 700);

    } catch (err) {
      console.warn('Erreur auth:', err);
      let readableError = 'Identifiants incorrects ou erreur réseau. Veuillez vérifier votre saisie.';
      if (err.message?.includes('Invalid login credentials') || err.message?.includes('Mot de passe')) {
        readableError = 'Numéro/Email ou mot de passe incorrect.';
      } else if (err.message?.includes('already registered') || err.message?.includes('existe déjà')) {
        readableError = 'Ce compte existe déjà. Veuillez cliquer sur « Se connecter ».';
      } else if (err.message) {
        readableError = err.message;
      }
      setErrorMsg(readableError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      {/* Header sobre et centré */}
      <div className="auth-card__header">
        <h2 className="auth-card__title">
          {mode === 'signin' ? 'Connexion à votre compte' : 'Créer votre compte'}
        </h2>
        <p className="auth-card__subtitle">
          {mode === 'signin' 
            ? 'Accédez à votre studio et à vos créations.' 
            : 'Générez et retrouvez vos images sur tous vos appareils.'}
        </p>
      </div>

      {/* Onglets Méthode discrets : Téléphone (par défaut) / Email */}
      <div className="auth-method-tabs">
        <button
          type="button"
          onClick={() => { setMethod('phone'); setErrorMsg(''); }}
          className={`auth-method-tab ${method === 'phone' ? 'auth-method-tab--active' : ''}`}
          aria-label="Connexion par numéro de téléphone"
        >
          <span>📱 Par Téléphone</span>
        </button>

        <button
          type="button"
          onClick={() => { setMethod('email'); setErrorMsg(''); }}
          className={`auth-method-tab ${method === 'email' ? 'auth-method-tab--active' : ''}`}
          aria-label="Connexion par adresse email"
        >
          <span>✉️ Par Email</span>
        </button>
      </div>

      {/* Message d'erreur */}
      {errorMsg && (
        <div style={{
          background: 'rgba(255, 75, 75, 0.12)',
          border: '1px solid rgba(255, 75, 75, 0.4)',
          borderRadius: '10px',
          padding: '10px 12px',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          color: '#FF6B6B',
          lineHeight: 1.4
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* Message de succès */}
      {successMsg && (
        <div style={{
          background: 'rgba(39, 201, 63, 0.12)',
          border: '1px solid rgba(39, 201, 63, 0.4)',
          borderRadius: '10px',
          padding: '10px 12px',
          marginBottom: '1rem',
          fontSize: '0.82rem',
          color: '#27C93F',
          lineHeight: 1.4
        }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="auth-form">
        {/* Champ Nom (uniquement en mode création de compte) */}
        {mode === 'signup' && (
          <div className="auth-field">
            <label className="auth-label">
              Votre nom ou prénom (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: Jean Paul"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="auth-input"
            />
          </div>
        )}

        {/* Méthode Téléphone */}
        {method === 'phone' ? (
          <div className="auth-field">
            <label className="auth-label">
              Numéro de téléphone
            </label>
            <div className="auth-phone-row">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="auth-select"
                aria-label="Indicatif pays"
              >
                {COUNTRY_CODES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="tel"
                placeholder="07 00 00 00"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                className="auth-input"
                aria-label="Numéro de téléphone"
              />
            </div>
          </div>
        ) : (
          /* Méthode Email */
          <div className="auth-field">
            <label className="auth-label">
              Adresse Email
            </label>
            <input
              type="email"
              placeholder="votre.nom@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              aria-label="Adresse email"
            />
          </div>
        )}

        {/* Mot de passe */}
        <div className="auth-field">
          <div className="auth-label-row">
            <label className="auth-label">
              Mot de passe
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="auth-toggle-pwd"
            >
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-input"
            aria-label="Mot de passe"
          />
        </div>

        {/* Bouton d'action principal */}
        <button
          type="submit"
          disabled={loading}
          className="auth-submit-btn"
        >
          {loading ? (
            <span>Connexion en cours...</span>
          ) : mode === 'signin' ? (
            <span>Se connecter à mon compte →</span>
          ) : (
            <span>Créer mon compte et continuer →</span>
          )}
        </button>
      </form>

      {/* Bouton discret en bas pour basculer Se connecter / Créer un compte */}
      <div className="auth-switch-footer">
        <div className="auth-switch-text">
          {mode === 'signin' ? (
            <>
              <span>Pas encore de compte ?</span>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                className="auth-switch-btn"
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              <span>Vous avez déjà un compte ?</span>
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                className="auth-switch-btn"
              >
                Se connecter
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rassurance visuelle discrète */}
      <div className="auth-footer-note">
        🔒 Vos créations et crédits sont sauvegardés et synchronisés en direct.
      </div>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <div className="auth-page">
      {/* Barre supérieure : retour et logo bien dégagés */}
      <header className="auth-page__top-nav" role="banner">
        <Link
          href="/"
          className="auth-page__back-btn"
          aria-label="Retourner à l'accueil PIXAXIS"
        >
          <span>← Accueil</span>
        </Link>

        <Link href="/" style={{ textDecoration: 'none' }} aria-label="PIXAXIS Accueil">
          <LogoPX size={32} withText={true} />
        </Link>

        {/* Élément d'équilibrage visuel pour centrage parfait du logo */}
        <div style={{ width: '82px' }} aria-hidden="true" />
      </header>

      {/* Contenu principal centré et 100% responsive */}
      <main className="auth-page__main" role="main">
        <Suspense fallback={
          <div className="auth-card" style={{ opacity: 0.85, minHeight: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h2 className="auth-card__title" style={{ marginBottom: '8px' }}>Connexion à votre compte</h2>
            <p className="auth-card__subtitle">Accédez à votre studio et à vos créations.</p>
            <div style={{ marginTop: '2rem', display: 'flex', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', animation: 'pulse 1s infinite' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', animation: 'pulse 1s infinite 0.2s' }} />
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', animation: 'pulse 1s infinite 0.4s' }} />
            </div>
          </div>
        }>
          <AuthForm />
        </Suspense>
      </main>

      {/* Pied de page sobre */}
      <footer style={{
        textAlign: 'center',
        fontSize: '0.74rem',
        color: 'rgba(255, 255, 255, 0.35)',
        padding: '0.75rem 0'
      }}>
        © 2026 PIXAXIS. Tous droits réservés.
      </footer>
    </div>
  );
}
