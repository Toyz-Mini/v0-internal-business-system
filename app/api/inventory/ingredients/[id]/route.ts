import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory.service';
import { z } from 'zod';

const updateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.string().min(1).optional(),
  min_stock: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).optional(),
  supplier_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ingredient = await InventoryService.getIngredientById(params.id);

    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(ingredient);
  } catch (error: any) {
    console.error('[API] Get ingredient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ingredient' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateIngredientSchema.parse(body);

    const ingredient = await InventoryService.updateIngredient(
      params.id,
      validatedData
    );

    return NextResponse.json(ingredient);
  } catch (error: any) {
    console.error('[API] Update ingredient error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update ingredient' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await InventoryService.updateIngredient(params.id, { is_active: false });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] Delete ingredient error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete ingredient' },
      { status: 500 }
    );
  }
}
