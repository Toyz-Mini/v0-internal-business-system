import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/services/customer.service';
import { z } from 'zod';

const notesSchema = z.object({
  notes: z.string()
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { notes } = notesSchema.parse(body);

    const customer = await CustomerService.update(params.id, { notes });

    return NextResponse.json({
      success: true,
      data: customer,
      message: 'Notes berj aya dikemaskini'
    });
  } catch (error: any) {
    console.error('[API] Update customer notes error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Gagal kemaskini notes' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return POST(request, { params });
}
