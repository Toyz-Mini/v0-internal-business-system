import { NextRequest, NextResponse } from 'next/server';
import { ModifierService } from '@/services/modifier.service';
import { createModifierOptionSchema } from '@/lib/validations/api.validation';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    const body = await request.json();
    const validatedData = createModifierOptionSchema.partial().parse(body);

    const option = await ModifierService.updateOption(params.optionId, validatedData);

    return NextResponse.json({
      success: true,
      message: 'Modifier option updated successfully',
      data: option
    });
  } catch (error) {
    console.error('Error updating modifier option:', error);

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
        error: 'Failed to update modifier option',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } }
) {
  try {
    await ModifierService.deleteOption(params.optionId);

    return NextResponse.json({
      success: true,
      message: 'Modifier option deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting modifier option:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete modifier option',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
