import { createClient } from '@/lib/supabase/server';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

export class CustomerService {
  static async getAll(): Promise<Customer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getById(id: string): Promise<Customer | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getActive(): Promise<Customer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async create(input: CreateCustomerInput): Promise<Customer> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
        total_orders: 0,
        total_spent: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, input: UpdateCustomerInput): Promise<Customer> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
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
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async search(query: string): Promise<Customer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async getTopCustomers(limit = 10): Promise<Customer[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('total_spent', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getCustomerOrders(customerId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async updateCustomerStats(customerId: string): Promise<void> {
    const supabase = await createClient();

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .eq('customer_id', customerId)
      .in('status', ['completed', 'ready']);

    if (orders && orders.length > 0) {
      const total_spent = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
      const total_orders = orders.length;
      const last_order_date = orders[0].created_at;

      await supabase
        .from('customers')
        .update({
          total_spent,
          total_orders,
          last_order_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
    }
  }
}
