import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const tables = [
      'categories',
      'products',
      'ingredients',
      'modifier_groups',
      'modifier_options',
      'orders',
      'order_items',
      'customers',
      'employees',
      'attendance',
      'stock_movements',
      'purchase_orders',
      'suppliers',
      'expenses'
    ];

    const counts: Record<string, number> = {};
    const errors: Record<string, string> = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          errors[table] = error.message;
        } else {
          counts[table] = count || 0;
        }
      } catch (err) {
        errors[table] = err instanceof Error ? err.message : 'Unknown error';
      }
    }

    const hasErrors = Object.keys(errors).length > 0;
    const status = hasErrors ? 'degraded' : 'healthy';

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        tables: counts,
        errors: hasErrors ? errors : undefined
      },
      summary: {
        totalTables: tables.length,
        successfulQueries: Object.keys(counts).length,
        failedQueries: Object.keys(errors).length
      }
    }, { status: hasErrors ? 207 : 200 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      { status: 500 }
    );
  }
}
