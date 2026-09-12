import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/admin';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminRequest(request);

    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { isAdmin: false, error: 'Accès administrateur non autorisé' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      isAdmin: true,
      email: adminCheck.email,
      userId: adminCheck.userId,
    });
  } catch (error) {
    console.error('Erreur API /api/admin/check:', error);
    return NextResponse.json(
      { isAdmin: false, error: 'Erreur lors du contrôle administrateur' },
      { status: 500 }
    );
  }
}
