import { NextRequest, NextResponse } from 'next/server';
import { ModifierService } from '@/services/modifier.service';
import { createModifierOptionSchema } from '@/lib/validations/api.validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const options = await ModifierService.getOptionsByGroup(params.id);

    return NextResponse.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching modifier options:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch modifier options',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = createModifierOptionSchema.parse({
      ...body,
      group_id: params.id
    });

    const option = await ModifierService.createOption(validatedData);

    return NextResponse.json({
      success: true,
      message: 'Modifier option created successfully',
      data: option
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating modifier option:', error);

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
        error: 'Failed to create modifier option',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
