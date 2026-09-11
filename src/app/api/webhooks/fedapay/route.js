import { NextResponse } from 'next/server';
import { fedapay } from '@/lib/fedapay';
import { creditUserAccountFromPayment } from '@/lib/credit-manager';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-fedapay-signature');

    if (process.env.FEDAPAY_WEBHOOK_SECRET) {
      const isValid = fedapay.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('Signature de webhook FedaPay invalide');
        return NextResponse.json({ error: 'Signature invalide' }, { status: 401 });
      }
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 });
    }

    const eventName = payload.name || payload.event;
    const entity = payload.entity || payload.data?.transaction || payload;
    const transactionId = entity?.id;

    if (!transactionId) {
      return NextResponse.json({ error: 'ID de transaction introuvable dans le webhook' }, { status: 400 });
    }

    const incomingStatus = entity?.status || (eventName === 'transaction.approved' ? 'approved' : 'pending');
    const actualTransaction = await fedapay.getTransaction(transactionId, incomingStatus);

    if (actualTransaction.status !== 'approved') {
      console.log(`Transaction FedaPay ${transactionId} ignorée car statut: ${actualTransaction.status}`);
      return NextResponse.json({ 
        received: true, 
        message: `Transaction non approuvée (statut actuel: ${actualTransaction.status}). Aucun crédit ajouté.` 
      });
    }

    const customMetadata = actualTransaction.custom_metadata || {};
    const userId = customMetadata.userId || customMetadata.user_id;
    const packId = customMetadata.packId || customMetadata.pack_id;

    if (!userId || !packId) {
      console.error(`Métadonnées userId ou packId manquantes pour transaction ${transactionId}`, customMetadata);
      return NextResponse.json({ error: 'Métadonnées de transaction incomplètes' }, { status: 400 });
    }

    const result = await creditUserAccountFromPayment({
      userId,
      packId,
      fedapayTransactionId: transactionId,
      montantFcfa: actualTransaction.amount,
    });

    if (result.alreadyProcessed) {
      console.log(`Transaction FedaPay ${transactionId} déjà traitée précédemment. Idempotence garantie.`);
      return NextResponse.json({ received: true, already_processed: true });
    }

    console.log(`Compte utilisateur ${userId} crédité avec succès pour le pack ${packId} (lot ${result.lot.id})`);
    return NextResponse.json({
      received: true,
      credited: true,
      lot_id: result.lot.id,
      credits: result.lot.credits_initiaux,
    });
  } catch (error) {
    console.error('Erreur traitement webhook FedaPay:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur interne de traitement du webhook' },
      { status: 500 }
    );
  }
}
