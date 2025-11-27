import { createClient } from '@/lib/supabase/server';
import { InventoryService } from './inventory.service';

export interface Order {
  id: string;
  order_number: string;
  customer_id: string | null;
  employee_id: string | null;
  order_type: 'dine-in' | 'takeaway' | 'delivery';
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  table_number: string | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string | null;
  payment_status: 'pending' | 'paid' | 'refunded';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers: any;
  notes: string | null;
  created_at: string;
}

export interface CreateOrderInput {
  customer_id?: string;
  employee_id?: string;
  order_type: 'dine-in' | 'takeaway' | 'delivery';
  table_number?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    modifiers?: any;
    notes?: string;
  }>;
  payment_method?: string;
  notes?: string;
  discount_amount?: number;
}

export class OrderService {
  static async getAll(limit = 100): Promise<Order[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  static async getById(id: string): Promise<Order | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getWithItems(orderId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('id', orderId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async create(input: CreateOrderInput): Promise<{ order: Order; items: OrderItem[] }> {
    const supabase = await createClient();

    const subtotal = input.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const tax_amount = subtotal * 0.06;
    const discount_amount = input.discount_amount ?? 0;
    const total_amount = subtotal + tax_amount - discount_amount;

    const order_number = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number,
        customer_id: input.customer_id || null,
        employee_id: input.employee_id || null,
        order_type: input.order_type,
        status: 'pending',
        table_number: input.table_number || null,
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        payment_method: input.payment_method || null,
        payment_status: input.payment_method ? 'paid' : 'pending',
        notes: input.notes || null
      })
      .select()
      .single();

    if (orderError) throw orderError;

    const orderItemsData = input.items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.unit_price * item.quantity,
      modifiers: item.modifiers || null,
      notes: item.notes || null
    }));

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData)
      .select();

    if (itemsError) throw itemsError;

    const ingredientsToDeduct: Array<{ ingredient_id: string; quantity: number }> = [];

    for (const item of input.items) {
      const { data: recipes } = await supabase
        .from('recipes')
        .select('ingredient_id, qty_per_unit')
        .eq('product_id', item.product_id);

      if (recipes && recipes.length > 0) {
        recipes.forEach(recipe => {
          ingredientsToDeduct.push({
            ingredient_id: recipe.ingredient_id,
            quantity: recipe.qty_per_unit * item.quantity
          });
        });
      }
    }

    if (ingredientsToDeduct.length > 0) {
      await InventoryService.deductStockForOrder(order.id, ingredientsToDeduct);
    }

    return { order, items: items || [] };
  }

  static async updateStatus(orderId: string, status: Order['status']): Promise<Order> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async updatePaymentStatus(orderId: string, paymentStatus: Order['payment_status'], paymentMethod?: string): Promise<Order> {
    const supabase = await createClient();
    const updateData: any = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };

    if (paymentMethod) {
      updateData.payment_method = paymentMethod;
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async cancelOrder(orderId: string): Promise<Order> {
    return this.updateStatus(orderId, 'cancelled');
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<Order[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  static async getRevenueStats(startDate: string, endDate: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('orders')
      .select('total_amount, status, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .in('status', ['completed', 'ready']);

    if (error) throw error;

    const orders = data || [];
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total_amount), 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    return {
      totalRevenue,
      orderCount,
      averageOrderValue,
      orders
    };
  }
}
