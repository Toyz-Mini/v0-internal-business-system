import { NextRequest, NextResponse } from 'next/server';
import { ProductService } from '@/services/product.service';
import { createProductSchema } from '@/lib/validations/api.validation';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categoryId = searchParams.get('categoryId');

    let products;
    if (categoryId) {
      products = await ProductService.getByCategory(categoryId);
    } else {
      products = await ProductService.getAll();
    }

    return NextResponse.json({
      success: true,
      data: products
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch menu items',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createProductSchema.parse(body);

    const supabase = await createClient();

    if (validatedData.sku) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, sku')
        .eq('sku', validatedData.sku)
        .maybeSingle();

      if (existingProduct) {
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate SKU',
            message: `A menu item with SKU "${validatedData.sku}" already exists.`
          },
          { status: 409 }
        );
      }
    }

    const product = await ProductService.create(validatedData);

    if (body.modifierGroupIds && Array.isArray(body.modifierGroupIds)) {
      for (const groupId of body.modifierGroupIds) {
        await supabase.from('product_modifiers').insert({
          product_id: product.id,
          modifier_group_id: groupId
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Menu item created successfully',
      data: product
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);

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
        error: 'Failed to create menu item',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
