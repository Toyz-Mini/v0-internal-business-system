import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { updateProductSchema } from '@/lib/validations/api.validation';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const product = await ProductService.getById(params.id);

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          error: 'Menu item not found'
        },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const { data: modifiers } = await supabase
      .from('product_modifiers')
      .select('modifier_group_id')
      .eq('product_id', params.id);

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        modifierGroupIds: modifiers?.map(m => m.modifier_group_id) || []
      }
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch menu item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateProductSchema.parse(body);

    const supabase = await createClient();

    if (validatedData.sku) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, sku')
        .eq('sku', validatedData.sku)
        .neq('id', params.id)
        .maybeSingle();

      if (existingProduct) {
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate SKU',
            message: `Another menu item with SKU "${validatedData.sku}" already exists.`
          },
          { status: 409 }
        );
      }
    }

    const product = await ProductService.update(params.id, validatedData);

    if (body.modifierGroupIds && Array.isArray(body.modifierGroupIds)) {
      await supabase
        .from('product_modifiers')
        .delete()
        .eq('product_id', params.id);

      for (const groupId of body.modifierGroupIds) {
        await supabase.from('product_modifiers').insert({
          product_id: params.id,
          modifier_group_id: groupId
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Error updating menu item:', error);

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update menu item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await ProductService.delete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete menu item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
