import { createClient } from '@/lib/supabase/server';

export interface ModifierGroup {
  id: string;
  name: string;
  is_required: boolean;
  max_selection: number;
  created_at: string;
}

export interface ModifierOption {
  id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  created_at: string;
}

export interface CreateModifierGroupInput {
  name: string;
  is_required?: boolean;
  max_selection?: number;
}

export interface CreateModifierOptionInput {
  group_id: string;
  name: string;
  price_adjustment?: number;
  is_default?: boolean;
}

export class ModifierService {
  static async getAllGroups(): Promise<ModifierGroup[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_groups')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getGroupById(id: string): Promise<ModifierGroup | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_groups')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getGroupWithOptions(groupId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_groups')
      .select(`
        *,
        modifier_options(*)
      `)
      .eq('id', groupId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getOptionsByGroup(groupId: string): Promise<ModifierOption[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_options')
      .select('*')
      .eq('group_id', groupId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createGroup(input: CreateModifierGroupInput): Promise<ModifierGroup> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_groups')
      .insert({
        name: input.name,
        is_required: input.is_required ?? false,
        max_selection: input.max_selection ?? 1
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async createOption(input: CreateModifierOptionInput): Promise<ModifierOption> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_options')
      .insert({
        group_id: input.group_id,
        name: input.name,
        price_adjustment: input.price_adjustment ?? 0,
        is_default: input.is_default ?? false
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateGroup(id: string, input: Partial<CreateModifierGroupInput>): Promise<ModifierGroup> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_groups')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateOption(id: string, input: Partial<CreateModifierOptionInput>): Promise<ModifierOption> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('modifier_options')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteGroup(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('modifier_groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async deleteOption(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('modifier_options')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
