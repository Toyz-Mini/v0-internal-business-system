import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/services/customer.service';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let customers;
    if (search) {
      customers = await CustomerService.search(search);
    } else {
      customers = await CustomerService.getAll();
    }

    return NextResponse.json({
      success: true,
      data: customers,
      count: customers.length
    });
  } catch (error: any) {
    console.error('[API] Get customers error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createCustomerSchema.parse(body);

    const customer = await CustomerService.create(validatedData);

    return NextResponse.json({
      success: true,
      data: customer
    }, { status: 201 });
  } catch (error: any) {
    console.error('[API] Create customer error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create customer' },
      { status: 500 }
    );
  }
}
