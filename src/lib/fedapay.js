import crypto from 'crypto';

/**
 * Client pour l'API REST FedaPay.
 * Utilise fetch natif — aucune dépendance npm tierce.
 */
class FedaPayClient {
  constructor() {
    this.apiKey = process.env.FEDAPAY_SECRET_KEY || '';
    this.environment = (process.env.FEDAPAY_ENVIRONMENT || 'sandbox').toLowerCase();
    this.baseUrl = this.environment === 'live' 
      ? 'https://api.fedapay.com/v1' 
      : 'https://sandbox-api.fedapay.com/v1';
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Crée une transaction sur FedaPay.
   */
  async createTransaction({ amount, description, callbackUrl, customer, customMetadata = {} }) {
    if (!this.apiKey) {
      throw new Error('FEDAPAY_SECRET_KEY non configurée dans les variables d’environnement.');
    }

    const payload = {
      description,
      amount,
      currency: { iso: 'XOF' },
      callback_url: callbackUrl,
      customer: {
        firstname: customer?.firstname || 'Client',
        lastname: customer?.lastname || 'PIXAXIS',
        email: customer?.email || 'client@pixaxis.ai',
      },
      custom_metadata: customMetadata,
    };

    const res = await fetch(`${this.baseUrl}/transactions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.message || data?.errors || 'Erreur création transaction FedaPay';
      console.error('Erreur FedaPay /transactions:', data);
      throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }

    return data['v1/transaction'] || data.transaction || data;
  }

  /**
   * Génère un jeton (token) et l'URL de redirection vers le guichet FedaPay.
   */
  async generatePaymentToken(transactionId) {
    const res = await fetch(`${this.baseUrl}/transactions/${transactionId}/token`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error('Erreur FedaPay /token:', data);
      throw new Error(data?.message || 'Erreur génération token FedaPay');
    }

    return {
      token: data.token,
      url: data.url,
    };
  }

  /**
   * Récupère les détails réels d'une transaction directement depuis FedaPay.
   */
  async getTransaction(transactionId, fallbackStatus = 'approved') {
    if (this.apiKey) {
      const res = await fetch(`${this.baseUrl}/transactions/${transactionId}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || `Transaction ${transactionId} introuvable sur FedaPay`);
      }

      return data['v1/transaction'] || data.transaction || data;
    }

    const { supabaseAdmin } = await import('./supabase-server');
    const { data: pendingTx } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('fedapay_transaction_id', String(transactionId))
      .eq('type', 'achat_pending')
      .maybeSingle();

    if (pendingTx) {
      return {
        id: String(transactionId),
        status: fallbackStatus,
        amount: pendingTx.montant_fcfa,
        custom_metadata: {
          userId: pendingTx.user_id,
          packId: pendingTx.pack_id,
        },
      };
    }

    throw new Error(`Transaction ${transactionId} introuvable sur FedaPay et aucun achat en attente correspondant trouvé en base.`);
  }

  verifyWebhookSignature(rawBody, signatureHeader, secret = process.env.FEDAPAY_WEBHOOK_SECRET) {
    if (!secret || !signatureHeader) {
      return true;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      const digest = hmac.update(rawBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
    } catch (err) {
      console.error('Erreur vérification signature webhook FedaPay:', err);
      return false;
    }
  }
}

export const fedapay = new FedaPayClient();
