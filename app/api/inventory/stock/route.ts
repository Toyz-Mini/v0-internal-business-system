import { NextRequest, NextResponse } from 'next/server';
import { InventoryService } from '@/services/inventory.service';
import { z } from 'zod';

const updateStockSchema = z.object({
  ingredient_id: z.string().uuid('Invalid ingredient ID'),
  type: z.enum(['in', 'out', 'adjustment'], {
    errorMap: () => ({ message: 'Type must be in, out, or adjustment' })
  }),
  quantity: z.number().positive('Quantity must be positive'),
  notes: z.string().optional(),
  created_by: z.string().optional(),
  reference_id: z.string().uuid().optional(),
  reference_type: z.string().optional(),
  unit_cost: z.number().min(0).optional(),
  total_cost: z.number().min(0).optional(),
  supplier_id: z.string().uuid().optional(),
  received_by: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateStockSchema.parse(body);

    const ingredient = await InventoryService.getIngredientById(validatedData.ingredient_id);
    if (!ingredient) {
      return NextResponse.json(
        { error: 'Ingredient not found' },
        { status: 404 }
      );
    }

    if (validatedData.type === 'out' || validatedData.type === 'adjustment') {
      if (ingredient.current_stock < validatedData.quantity) {
        return NextResponse.json(
          {
            error: 'Insufficient stock',
            message: `Stok tidak mencukupi. Stok semasa: ${ingredient.current_stock} ${ingredient.unit}, diminta: ${validatedData.quantity} ${ingredient.unit}`,
            current_stock: ingredient.current_stock,
            requested: validatedData.quantity
          },
          { status: 400 }
        );
      }
    }

    const stockLog = await InventoryService.updateStock(validatedData);

    return NextResponse.json({
      success: true,
      log: stockLog,
      message: 'Stock updated successfully'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Update stock error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update stock' },
      { status: 500 }
    );
  }
}
