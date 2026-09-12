import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyAdminRequest, logAdminAction } from '@/lib/admin';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('q') || '').trim().toLowerCase();
    const filter = searchParams.get('filter') || 'all'; // all | actifs | inactifs | avec_credits | sans_credits | nouveaux | gros_utilisateurs
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    // Récupérer tous les profils, crédits, transactions et générations en parallèle
    const [profilesRes, creditsRes, txRes, genRes] = await Promise.all([
      supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('credits')
        .select('id, user_id, pack_id, montant_achete, credits_initiaux, credits_restants, date_achat, date_expiration'),
      supabaseAdmin
        .from('transactions')
        .select('id, user_id, type, montant_fcfa, pack_id, date_transaction'),
      supabaseAdmin
        .from('generated_images')
        .select('id, user_id, date_creation, credits_utilises, is_admin')
    ]);

    const profiles = profilesRes.data || [];
    const credits = creditsRes.data || [];
    const transactions = txRes.data || [];
    const generations = genRes.data || [];

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Enrichir chaque profil avec ses métriques réelles
    const enrichedUsers = profiles.map((p) => {
      const userCredits = credits.filter((c) => c.user_id === p.id);
      const userTx = transactions.filter((t) => t.user_id === p.id);
      const userGen = generations.filter((g) => g.user_id === p.id);

      const creditsRestants = userCredits.reduce((sum, c) => sum + (c.credits_restants || 0), 0);
      const creditsAchetes = userCredits.reduce((sum, c) => sum + (c.credits_initiaux || 0), 0);
      const creditsConsommes = Math.max(0, creditsAchetes - creditsRestants);

      const paidTx = userTx.filter((t) => (t.type === 'achat_pack' || t.type === 'achat') && (t.montant_fcfa || 0) > 0);
      const montantTotalPaye = paidTx.reduce((sum, t) => sum + (t.montant_fcfa || 0), 0);

      // Dernier forfait acheté
      const sortedTx = [...paidTx].sort((a, b) => new Date(b.date_transaction) - new Date(a.date_transaction));
      const dernierForfait = sortedTx[0]?.pack_id || null;

      // Dernier accès / activité
      const allActivityDates = [
        ...userGen.map((g) => g.date_creation),
        ...userTx.map((t) => t.date_transaction),
        p.updated_at,
        p.created_at,
      ].filter(Boolean);
      allActivityDates.sort((a, b) => new Date(b) - new Date(a));
      const dernierAcces = allActivityDates[0] || p.created_at;

      const isActif = userGen.length > 0 || paidTx.length > 0;
      const isNouveau = p.created_at >= sevenDaysAgo;
      const isGrosUtilisateur = montantTotalPaye >= 5000 || userGen.length >= 5;

      return {
        id: p.id,
        nom: p.display_name || 'Utilisateur',
        email: p.email || 'Non renseigné',
        telephone: p.phone || null,
        nom_business: p.business_name || null,
        date_creation: p.created_at,
        dernier_acces: dernierAcces,
        credits_actuels: creditsRestants,
        credits_achetes: creditsAchetes,
        credits_consommes: creditsConsommes,
        nombre_generations: userGen.length,
        generations_admin_count: userGen.filter((g) => g.is_admin === true).length,
        montant_total_paye: montantTotalPaye,
        dernier_forfait: dernierForfait,
        statut: isActif ? 'actif' : 'inactif',
        has_credits: creditsRestants > 0,
        is_nouveau: isNouveau,
        is_gros_utilisateur: isGrosUtilisateur,
        logo_url: p.logo_url || null,
        preferred_format: p.preferred_format || null,
      };
    });

    // Application de la recherche
    let filtered = enrichedUsers;
    if (search) {
      filtered = filtered.filter((u) => {
        return (
          (u.nom && u.nom.toLowerCase().includes(search)) ||
          (u.email && u.email.toLowerCase().includes(search)) ||
          (u.telephone && u.telephone.toLowerCase().includes(search)) ||
          (u.nom_business && u.nom_business.toLowerCase().includes(search))
        );
      });
    }

    // Application des filtres par catégorie
    if (filter === 'actifs') {
      filtered = filtered.filter((u) => u.statut === 'actif');
    } else if (filter === 'inactifs') {
      filtered = filtered.filter((u) => u.statut === 'inactif');
    } else if (filter === 'avec_credits') {
      filtered = filtered.filter((u) => u.credits_actuels > 0);
    } else if (filter === 'sans_credits') {
      filtered = filtered.filter((u) => u.credits_actuels === 0);
    } else if (filter === 'nouveaux') {
      filtered = filtered.filter((u) => u.is_nouveau);
    } else if (filter === 'gros_utilisateurs') {
      filtered = filtered.filter((u) => u.is_gros_utilisateur);
    }

    // Pagination
    const totalUsers = filtered.length;
    const totalPages = Math.ceil(totalUsers / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedUsers = filtered.slice(offset, offset + limit);

    // Journaliser l'accès
    logAdminAction({
      adminEmail: adminCheck.email,
      adminUserId: adminCheck.userId,
      action: 'view_users_list',
      target: `page_${page}_filter_${filter}`,
      result: 'success',
      metadata: { total: totalUsers, search },
    });

    return NextResponse.json({
      success: true,
      total: totalUsers,
      page,
      limit,
      total_pages: totalPages,
      users: paginatedUsers,
    });
  } catch (error) {
    console.error('Erreur API /api/admin/users:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des utilisateurs.' },
      { status: 500 }
    );
  }
}
