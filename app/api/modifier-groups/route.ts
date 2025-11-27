import { NextResponse } from 'next/server';
import { ModifierService } from '@/services/modifier.service';

export async function GET() {
  try {
    const groups = await ModifierService.getAllGroups();

    return NextResponse.json({
      success: true,
      data: groups
    });
  } catch (error) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch modifier groups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
