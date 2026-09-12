import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { verifyAdminRequest } from '@/lib/admin';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json({ error: 'Accès administrateur refusé.' }, { status: 403 });
    }

    const { data: logs, error } = await supabaseAdmin
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.warn('Avertissement lecture logs audit:', error);
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
    });
  } catch (error) {
    console.error('Erreur API /api/admin/audit:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des journaux d’audit.' },
      { status: 500 }
    );
  }
}
