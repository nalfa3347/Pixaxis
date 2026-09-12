import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, method, phone, email, password, fullName } = body;

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères.' },
        { status: 400 }
      );
    }

    let targetEmail = '';
    let userPhone = '';

    if (method === 'phone') {
      if (!phone) {
        return NextResponse.json(
          { error: 'Veuillez renseigner un numéro de téléphone valide.' },
          { status: 400 }
        );
      }
      userPhone = phone.trim();
      const cleanDigits = userPhone.replace(/\D/g, '');
      targetEmail = `phone_${cleanDigits}@pixaxis.com`;
    } else {
      if (!email || !email.includes('@')) {
        return NextResponse.json(
          { error: 'Veuillez renseigner une adresse email valide.' },
          { status: 400 }
        );
      }
      targetEmail = email.trim().toLowerCase();
    }

    if (action === 'signup') {
      // 1. Tenter la création directe de l'utilisateur avec confirmation immédiate (sans dépendance SMTP)
      const createRes = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          phone: userPhone || undefined,
          full_name: fullName?.trim() || (userPhone ? `Utilisateur ${userPhone}` : 'Membre PIXAXIS'),
        },
      });

      if (createRes.data?.user) {
        const userId = createRes.data.user.id;
        // Enregistrer également dans la table profiles pour synchronisation
        const userProfile = {
          id: userId,
          email: targetEmail,
          display_name: fullName?.trim() || (userPhone ? `Utilisateur ${userPhone}` : 'Membre PIXAXIS'),
          phone: userPhone || null,
          has_completed_onboarding: false,
          created_at: new Date().toISOString(),
        };
        const { error: profErr } = await supabaseAdmin.from('profiles').upsert(userProfile);
        if (profErr) console.warn('Erreur upsert profile:', profErr);

        // Règle d'or : AUCUN crédit gratuit d'accueil. L'utilisateur doit obligatoirement acheter un forfait payant.
        return NextResponse.json({
          success: true,
          action: 'created',
          isNewUser: true,
          hasCompletedOnboarding: false,
          requiresPlan: true,
          targetEmail,
          userId: userId,
          message: 'Compte créé avec succès ! Veuillez choisir votre forfait pour commencer.',
        });
      }

      // Si déjà inscrit, on informe le client pour basculer ou connecter directement
      const errMsg = (createRes.error?.message || '').toLowerCase();
      if (errMsg.includes('already') || errMsg.includes('registered') || errMsg.includes('exists')) {
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          targetEmail,
          message: 'Ce compte existe déjà. Connexion en cours...',
        });
      }

      return NextResponse.json(
        { error: createRes.error?.message || 'Erreur lors de la création du compte.' },
        { status: 400 }
      );
    }

    // Action === 'signin'
    return NextResponse.json({
      success: true,
      targetEmail,
    });
  } catch (err) {
    console.error('Erreur API Auth:', err);
    return NextResponse.json(
      { error: err.message || 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
