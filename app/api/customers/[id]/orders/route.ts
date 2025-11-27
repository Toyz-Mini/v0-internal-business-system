import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          product:products (
            id,
            name,
            image_url
          )
        )
      `)
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: orders || [],
      count: orders?.length || 0
    });
  } catch (error: any) {
    console.error('[API] Get customer orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer orders' },
      { status: 500 }
    );
  }
}
