import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { createOrderSchema } from '@/lib/validations/api.validation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100;

    const orders = await OrderService.getAll(limit);

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validatedData = createOrderSchema.parse(body);

    const result = await OrderService.create(validatedData);

    return NextResponse.json({
      success: true,
      message: 'Order created successfully',
      data: result
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);

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
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
