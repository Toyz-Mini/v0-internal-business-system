import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/services/order.service';
import { updateOrderStatusSchema, updatePaymentStatusSchema } from '@/lib/validations/api.validation';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await OrderService.getWithItems(params.id);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    if (body.status) {
      const validatedData = updateOrderStatusSchema.parse(body);
      const updatedOrder = await OrderService.updateStatus(params.id, validatedData.status);

      return NextResponse.json({
        success: true,
        message: 'Order status updated',
        data: updatedOrder
      });
    }

    if (body.payment_status) {
      const validatedData = updatePaymentStatusSchema.parse(body);
      const updatedOrder = await OrderService.updatePaymentStatus(
        params.id,
        validatedData.payment_status,
        validatedData.payment_method
      );

      return NextResponse.json({
        success: true,
        message: 'Payment status updated',
        data: updatedOrder
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'No valid update data provided'
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating order:', error);

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
        error: 'Failed to update order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
