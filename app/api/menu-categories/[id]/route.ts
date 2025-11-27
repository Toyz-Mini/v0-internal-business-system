import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/services/category.service';
import { ProductService } from '@/services/product.service';
import { updateCategorySchema } from '@/lib/validations/api.validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const category = await CategoryService.getById(params.id);

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch category',
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
    const validatedData = updateCategorySchema.parse(body);

    const category = await CategoryService.update(params.id, validatedData);

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);

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
        error: 'Failed to update category',
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
    const productsInCategory = await ProductService.getByCategory(params.id);

    if (productsInCategory.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete category',
          message: `This category has ${productsInCategory.length} menu item(s) linked to it. Please reassign or delete the items first.`,
          linkedItemsCount: productsInCategory.length
        },
        { status: 409 }
      );
    }

    await CategoryService.delete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete category',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
