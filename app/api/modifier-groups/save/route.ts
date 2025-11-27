import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, is_required, max_selections, modifiers } = body;

    if (!name || !modifiers || modifiers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and at least one modifier are required'
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    let groupId = id;

    if (groupId) {
      const { error } = await supabase
        .from('modifier_groups')
        .update({
          name,
          is_required,
          max_selections: parseInt(max_selections)
        })
        .eq('id', groupId);

      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('modifier_groups')
        .insert({
          name,
          is_required,
          max_selections: parseInt(max_selections)
        })
        .select()
        .single();

      if (error) throw error;
      groupId = data.id;
    }

    await supabase.from('modifiers').delete().eq('group_id', groupId);

    const validModifiers = modifiers.filter((mod: any) => mod.name.trim());

    if (validModifiers.length > 0) {
      const { error: modifiersError } = await supabase.from('modifiers').insert(
        validModifiers.map((mod: any) => ({
          group_id: groupId,
          name: mod.name,
          price_adjustment: parseFloat(mod.price_adjustment) || 0,
          is_active: mod.is_active
        }))
      );

      if (modifiersError) throw modifiersError;
    }

    return NextResponse.json({
      success: true,
      message: id ? 'Modifier updated successfully' : 'Modifier created successfully',
      data: { id: groupId }
    });
  } catch (error) {
    console.error('Error saving modifier group:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save modifier group',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
