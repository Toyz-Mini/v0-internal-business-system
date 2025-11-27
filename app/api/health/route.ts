import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Database connection failed',
          details: error.message
        },
        { status: 503 }
      );
    }

    const gitShort = process.env.GIT_COMMIT_SHA?.substring(0, 7) || 'dev';
    const version = process.env.npm_package_version || '1.0.0';

    return NextResponse.json({
      ok: true,
      version: `${version}-${gitShort}`,
      timestamp: new Date().toISOString(),
      database: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
