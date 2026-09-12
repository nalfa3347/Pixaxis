import { NextResponse } from 'next/server';
import { getPackById } from '@/config/constants';
import { checkRepurchaseRestriction } from '@/lib/credit-manager';
import { fedapay } from '@/lib/fedapay';
import { supabaseAdmin, resolveUser } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Veuillez vous connecter pour acheter des crédits.', requireAuth: true },
        { status: 401 }
      );
    }
    const userId = user.id;

    const body = await request.json();
    const { pack_id } = body;

    if (!pack_id) {
      return NextResponse.json({ error: 'Le paramètre pack_id est obligatoire.' }, { status: 400 });
    }

    const pack = getPackById(pack_id);
    if (!pack) {
      return NextResponse.json({ error: `Pack inconnu: ${pack_id}` }, { status: 400 });
    }

    // ─── RÈGLE MÉTIER STRICTE : Restriction de rachat du même pack ───
    const restriction = await checkRepurchaseRestriction(userId, pack.id);
    if (!restriction.allowed) {
      return NextResponse.json(
        { error: restriction.reason, active_lot: restriction.existingLot },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${appUrl}/profil?payment=return&pack_id=${pack.id}`;

    let transactionId;
    let paymentUrl;
    let token = null;

    const isTestMode = body.test_mode === true || request.headers.get('x-test-mode') === 'true';

    if (process.env.FEDAPAY_SECRET_KEY && !isTestMode) {
      const userEmail = user.email || 'client@pixaxis.ai';
      const userName = user.user_metadata?.full_name || 'Client PIXAXIS';
      const userPhone = user.user_metadata?.phone;

      // ─── Initialisation de la transaction réelle sur FedaPay ───
      const transaction = await fedapay.createTransaction({
        amount: pack.price_fcfa,
        description: `PIXAXIS - Achat Pack ${pack.name} (${pack.images_count} images)`,
        callbackUrl,
        customer: {
          firstname: userName.split(' ')[0] || 'Client',
          lastname: userName.split(' ').slice(1).join(' ') || 'PIXAXIS',
          email: userEmail,
          phone_number: userPhone ? { number: userPhone } : undefined,
        },
        customMetadata: {
          userId,
          packId: pack.id,
        },
      });

      const tokenData = await fedapay.generatePaymentToken(transaction.id);
      transactionId = String(transaction.id);
      paymentUrl = tokenData.url;
      token = tokenData.token;
    } else {
      // ─── Mode Sandbox / Test local sans clé secrète externe ───
      transactionId = `fp_tx_${Date.now()}`;
      paymentUrl = `${appUrl}/profil?payment=return&id=${transactionId}&pack_id=${pack.id}`;
    }

    // ─── Enregistrement de l'achat en attente dans la table transactions ───
    const { supabaseAdmin } = await import('@/lib/supabase-server');
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      type: 'achat_pending',
      montant_fcfa: pack.price_fcfa,
      pack_id: pack.id,
      fedapay_transaction_id: transactionId,
    });

    return NextResponse.json({
      success: true,
      transaction_id: transactionId,
      payment_url: paymentUrl,
      token,
      pack: {
        id: pack.id,
        name: pack.name,
        price_fcfa: pack.price_fcfa,
        credits: pack.credits_credited,
      },
    });
  } catch (error) {
    console.error('Erreur API /checkout/fedapay:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne lors de l’initialisation du paiement' },
      { status: 500 }
    );
  }
}
