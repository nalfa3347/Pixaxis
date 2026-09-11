import { NextResponse } from 'next/server';
import { fedapay } from '@/lib/fedapay';
import { creditUserAccountFromPayment } from '@/lib/credit-manager';

export async function POST(request) {
  try {
    const { transaction_id } = await request.json();

    if (!transaction_id) {
      return NextResponse.json({ error: 'transaction_id requis' }, { status: 400 });
    }

    // Vérification directe serveur-à-serveur avec FedaPay
    const tx = await fedapay.getTransaction(transaction_id);

    if (tx.status !== 'approved') {
      return NextResponse.json({
        approved: false,
        status: tx.status,
        message: `La transaction n’est pas approuvée (statut: ${tx.status}). Aucun crédit ajouté.`,
      });
    }

    const customMetadata = tx.custom_metadata || {};
    const userId = customMetadata.userId || customMetadata.user_id;
    const packId = customMetadata.packId || customMetadata.pack_id;

    if (!userId || !packId) {
      return NextResponse.json({ error: 'Métadonnées incomplètes sur la transaction' }, { status: 400 });
    }

    const result = await creditUserAccountFromPayment({
      userId,
      packId,
      fedapayTransactionId: transaction_id,
      montantFcfa: tx.amount,
    });

    return NextResponse.json({
      approved: true,
      credited: result.credited,
      already_processed: result.alreadyProcessed,
      lot: result.lot,
    });
  } catch (error) {
    console.error('Erreur vérification transaction FedaPay:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la vérification de la transaction' },
      { status: 500 }
    );
  }
}
