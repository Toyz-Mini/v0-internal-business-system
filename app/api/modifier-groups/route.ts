import { NextRequest, NextResponse } from 'next/server';
import { ModifierService } from '@/services/modifier.service';
import { createModifierGroupSchema } from '@/lib/validations/api.validation';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: groups, error } = await supabase
      .from('modifier_groups')
      .select('*')
      .order('name');

    if (error) throw error;

    const { data: modifiers } = await supabase
      .from('modifiers')
      .select('*')
      .order('name');

    const groupsWithModifiers = groups?.map(group => ({
      ...group,
      modifiers: modifiers?.filter(mod => mod.group_id === group.id) || []
    })) || [];

    return NextResponse.json({
      success: true,
      data: groupsWithModifiers
    });
  } catch (error) {
    console.error('Error fetching modifier groups:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch modifier groups',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createModifierGroupSchema.parse(body);

    const group = await ModifierService.createGroup(validatedData);

    return NextResponse.json({
      success: true,
      message: 'Modifier group created successfully',
      data: group
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating modifier group:', error);

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
        error: 'Failed to create modifier group',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
