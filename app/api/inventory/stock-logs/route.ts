import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredientId = searchParams.get('ingredient_id');
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = await createClient();

    let query = supabase
      .from('stock_logs')
      .select('*, ingredient:ingredients(id, name, unit)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (ingredientId) {
      query = query.eq('ingredient_id', ingredientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('[API] Get stock logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stock logs' },
      { status: 500 }
    );
  }
}
