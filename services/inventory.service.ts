import { createClient } from '@/lib/supabase/server';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockLog {
  id: string;
  ingredient_id: string;
  type: 'in' | 'out' | 'adjustment' | 'order_deduct';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_id: string | null;
  reference_type: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CreateIngredientInput {
  name: string;
  unit: string;
  current_stock?: number;
  min_stock?: number;
  cost_per_unit?: number;
  supplier_id?: string;
  is_active?: boolean;
}

export interface UpdateStockInput {
  ingredient_id: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  notes?: string;
  created_by?: string;
  reference_id?: string;
  reference_type?: string;
}

export class InventoryService {
  static async getAllIngredients(): Promise<Ingredient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getIngredientById(id: string): Promise<Ingredient | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getLowStock(): Promise<Ingredient[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ingredients')
      .select('*')
      .filter('current_stock', 'lte', 'min_stock')
      .eq('is_active', true)
      .order('current_stock', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createIngredient(input: CreateIngredientInput): Promise<Ingredient> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ingredients')
      .insert({
        name: input.name,
        unit: input.unit,
        current_stock: input.current_stock ?? 0,
        min_stock: input.min_stock ?? 0,
        cost_per_unit: input.cost_per_unit ?? 0,
        supplier_id: input.supplier_id || null,
        is_active: input.is_active ?? true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updateIngredient(id: string, input: Partial<CreateIngredientInput>): Promise<Ingredient> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('ingredients')
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

  static async updateStock(input: UpdateStockInput): Promise<StockLog> {
    const supabase = await createClient();

    const ingredient = await this.getIngredientById(input.ingredient_id);
    if (!ingredient) {
      throw new Error('Ingredient not found');
    }

    const previous_stock = ingredient.current_stock;
    let new_stock = previous_stock;

    if (input.type === 'in') {
      new_stock = previous_stock + input.quantity;
    } else if (input.type === 'out' || input.type === 'adjustment') {
      new_stock = previous_stock - input.quantity;
    }

    const { data: stockLog, error: logError } = await supabase
      .from('stock_logs')
      .insert({
        ingredient_id: input.ingredient_id,
        type: input.type,
        quantity: input.quantity,
        previous_stock,
        new_stock,
        notes: input.notes || null,
        created_by: input.created_by || null,
        reference_id: input.reference_id || null,
        reference_type: input.reference_type || null
      })
      .select()
      .single();

    if (logError) throw logError;

    const { error: updateError } = await supabase
      .from('ingredients')
      .update({
        current_stock: new_stock,
        updated_at: new Date().toISOString()
      })
      .eq('id', input.ingredient_id);

    if (updateError) throw updateError;

    return stockLog;
  }

  static async getStockLogs(ingredientId: string, limit = 50): Promise<StockLog[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('stock_logs')
      .select('*')
      .eq('ingredient_id', ingredientId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async deductStockForOrder(
    orderId: string,
    ingredients: Array<{ ingredient_id: string; quantity: number }>
  ): Promise<void> {
    const supabase = await createClient();

    for (const item of ingredients) {
      const ingredient = await this.getIngredientById(item.ingredient_id);
      if (!ingredient) continue;

      const previous_stock = ingredient.current_stock;
      const new_stock = previous_stock - item.quantity;

      await supabase
        .from('stock_logs')
        .insert({
          ingredient_id: item.ingredient_id,
          type: 'order_deduct',
          quantity: item.quantity,
          previous_stock,
          new_stock,
          reference_id: orderId,
          reference_type: 'order',
          notes: `Auto-deducted for order ${orderId}`
        });

      await supabase
        .from('ingredients')
        .update({
          current_stock: new_stock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.ingredient_id);
    }
  }
}
