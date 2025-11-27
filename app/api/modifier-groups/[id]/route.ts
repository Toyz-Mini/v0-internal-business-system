import { NextRequest, NextResponse } from 'next/server';
import { ModifierService } from '@/services/modifier.service';
import { createModifierGroupSchema } from '@/lib/validations/api.validation';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const group = await ModifierService.getGroupWithOptions(params.id);

    if (!group) {
      return NextResponse.json(
        {
          success: false,
          error: 'Modifier group not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: group
    });
  } catch (error) {
    console.error('Error fetching modifier group:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch modifier group',
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
    const validatedData = createModifierGroupSchema.partial().parse(body);

    const group = await ModifierService.updateGroup(params.id, validatedData);

    return NextResponse.json({
      success: true,
      message: 'Modifier group updated successfully',
      data: group
    });
  } catch (error) {
    console.error('Error updating modifier group:', error);

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
        error: 'Failed to update modifier group',
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
    const supabase = await createClient();

    const { data: productModifiers } = await supabase
      .from('product_modifiers')
      .select('id')
      .eq('modifier_group_id', params.id)
      .limit(1);

    if (productModifiers && productModifiers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete modifier group',
          message: 'This modifier group is linked to menu items. Please unlink it first.',
          linkedItemsCount: productModifiers.length
        },
        { status: 409 }
      );
    }

    await supabase
      .from('modifiers')
      .delete()
      .eq('group_id', params.id);

    await ModifierService.deleteGroup(params.id);

    return NextResponse.json({
      success: true,
      message: 'Modifier group deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting modifier group:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete modifier group',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
