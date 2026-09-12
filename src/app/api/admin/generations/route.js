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
    const scope = searchParams.get('scope') || 'all'; // all | users | admin
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '30', 10)));

    // Récupérer les images générées et les profils
    const [imagesRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from('generated_images')
        .select('*')
        .order('date_creation', { ascending: false }),
      supabaseAdmin
        .from('profiles')
        .select('id, display_name, email')
    ]);

    const images = imagesRes.data || [];
    const profiles = profilesRes.data || [];
    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const formatted = images.map((img) => {
      const user = profileMap.get(img.user_id);
      const isAdminGen = img.is_admin === true;

      return {
        id: img.id,
        user_id: img.user_id,
        user_name: user?.display_name || 'Utilisateur inconnu',
        user_email: user?.email || 'Sans email',
        modele: 'IDEOGRAM 4.0',
        type_creation: img.type_creation || 'product',
        style: img.style || 'realistic',
        format: img.format || '1024x1024',
        prompt: img.prompt || '',
        credits_utilises: img.credits_utilises || (isAdminGen ? 0 : 200),
        is_admin: isAdminGen,
        url: img.url,
        date_creation: img.date_creation,
        statut: img.url ? 'reussi' : 'inconnu',
      };
    });

    // Filtre par scope : tout, payantes utilisateurs, ou gratuites admin
    let filtered = formatted;
    if (scope === 'users') {
      filtered = filtered.filter((g) => !g.is_admin);
    } else if (scope === 'admin') {
      filtered = filtered.filter((g) => g.is_admin);
    }

    const totalCount = filtered.length;
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    const userGenCount = formatted.filter((g) => !g.is_admin).length;
    const adminGenCount = formatted.filter((g) => g.is_admin).length;

    logAdminAction({
      adminEmail: adminCheck.email,
      adminUserId: adminCheck.userId,
      action: 'view_generations',
      target: `scope_${scope}_page_${page}`,
      result: 'success',
      metadata: { total: totalCount, userGenCount, adminGenCount },
    });

    return NextResponse.json({
      success: true,
      summary: {
        total_generations: formatted.length,
        user_generations_count: userGenCount,
        admin_generations_count: adminGenCount,
      },
      page,
      limit,
      total_count: totalCount,
      total_pages: Math.ceil(totalCount / limit) || 1,
      generations: paginated,
    });
  } catch (error) {
    console.error('Erreur API /api/admin/generations:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des générations admin.' },
      { status: 500 }
    );
  }
}
