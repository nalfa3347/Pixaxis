import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';
import { MAX_CONCURRENT_GENERATIONS } from '@/config/constants';

const queueCache = new Map();
const CACHE_TTL = 5000;

export async function GET(request) {
  try {
    const userIdHeader = request.headers.get('x-user-id');
    const userId = userIdHeader || '00000000-0000-0000-0000-000000000001';

    const cached = queueCache.get(userId);
    if (cached && Date.now() - cached.time < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const { count, error } = await supabaseAdmin
      .from('generation_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'processing');

    if (error) throw error;

    const activeCount = count || 0;
    const availableSlots = Math.max(0, MAX_CONCURRENT_GENERATIONS - activeCount);
    const canQueue = activeCount < MAX_CONCURRENT_GENERATIONS;

    const result = {
      active_count: activeCount,
      max_limit: MAX_CONCURRENT_GENERATIONS,
      available_slots: availableSlots,
      can_queue: canQueue,
    };

    queueCache.set(userId, { data: result, time: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur GET /api/queue:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
