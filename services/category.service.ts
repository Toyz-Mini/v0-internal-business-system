import { createClient } from '@/lib/supabase/server';

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  sort_order?: number;
  is_active?: boolean;
}

export class CategoryService {
  static async getAll(): Promise<Category[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getById(id: string): Promise<Category | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getActive(): Promise<Category[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async create(input: CreateCategoryInput): Promise<Category> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: input.name,
        description: input.description || null,
        sort_order: input.sort_order ?? 0,
        is_active: input.is_active ?? true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, input: UpdateCategoryInput): Promise<Category> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('categories')
      .update(input)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
