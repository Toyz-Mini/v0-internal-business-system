import { createClient } from '@/lib/supabase/server';

export interface Product {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  image_url: string | null;
  sku: string | null;
  is_available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateProductInput {
  category_id?: string;
  name: string;
  description?: string;
  price: number;
  cost_price?: number;
  image_url?: string;
  sku?: string;
  is_available?: boolean;
  sort_order?: number;
}

export interface UpdateProductInput {
  category_id?: string;
  name?: string;
  description?: string;
  price?: number;
  cost_price?: number;
  image_url?: string;
  sku?: string;
  is_available?: boolean;
  sort_order?: number;
}

export class ProductService {
  static async getAll(): Promise<Product[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getById(id: string): Promise<Product | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getByCategory(categoryId: string): Promise<Product[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_available', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getAvailable(): Promise<Product[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_available', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async create(input: CreateProductInput): Promise<Product> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .insert({
        category_id: input.category_id || null,
        name: input.name,
        description: input.description || null,
        price: input.price,
        cost_price: input.cost_price ?? 0,
        image_url: input.image_url || null,
        sku: input.sku || null,
        is_available: input.is_available ?? true,
        sort_order: input.sort_order ?? 0
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, input: UpdateProductInput): Promise<Product> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .update({
        ...input,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async search(query: string): Promise<Product[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,sku.ilike.%${query}%`)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
