import { NextRequest, NextResponse } from 'next/server';
import { CustomerService } from '@/services/customer.service';
import { z } from 'zod';

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customer = await CustomerService.getById(params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    console.error('[API] Get customer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch customer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

    const customer = await CustomerService.update(params.id, validatedData);

    return NextResponse.json({
      success: true,
      data: customer
    });
  } catch (error: any) {
    console.error('[API] Update customer error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await CustomerService.delete(params.id);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error: any) {
    console.error('[API] Delete customer error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete customer' },
      { status: 500 }
    );
  }
}
