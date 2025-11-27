import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory.service';
import { z } from 'zod';

const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().min(1, 'Unit is required'),
  current_stock: z.number().min(0).optional(),
  min_stock: z.number().min(0).optional(),
  cost_per_unit: z.number().min(0).optional(),
  supplier_id: z.string().uuid().optional(),
  is_active: z.boolean().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    let ingredients;
    if (lowStockOnly) {
      ingredients = await InventoryService.getLowStock();
    } else {
      ingredients = await InventoryService.getAllIngredients();
    }

    return NextResponse.json(ingredients);
  } catch (error: any) {
    console.error('[API] Get ingredients error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ingredients' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createIngredientSchema.parse(body);

    const ingredient = await InventoryService.createIngredient(validatedData);

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error: any) {
    console.error('[API] Create ingredient error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create ingredient' },
      { status: 500 }
    );
  }
}
