"use client"

import { forwardRef } from "react"
import type { Order } from "@/lib/types"
import Image from "next/image"
import { formatCurrency, formatModifierPrice } from "@/lib/ux-utils"

interface ReceiptTemplateProps {
  order: Order
  businessName?: string
  businessAddress?: string
  businessPhone?: string
  logoUrl?: string | null
  footerImageUrl?: string | null
  showLogo?: boolean
  showBusinessName?: boolean
  showFooterImage?: boolean
  showItemImages?: boolean
  receiptWidth?: number
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  (
    {
      order,
      businessName = "AbangBob Ayam Gunting",
      businessAddress = "Lot 123, Jalan Pasar, Brunei",
      businessPhone = "+673 123-4567",
      logoUrl,
      footerImageUrl,
      showLogo = true,
      showBusinessName = true,
      showFooterImage = false,
      showItemImages = false,
      receiptWidth = 80,
    },
    ref,
  ) => {
    const formatDate = (date: string) => {
      return new Date(date).toLocaleString("ms-MY", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    }

    const widthClass = receiptWidth === 58 ? "w-[58mm]" : receiptWidth === 210 ? "w-[210mm]" : "w-[80mm]"

    return (
      <div ref={ref} className={`${widthClass} bg-white text-black p-4 font-mono text-xs print:block hidden`}>
        {/* Logo */}
        {showLogo && logoUrl && (
          <div className="flex justify-center mb-3">
            <div className="relative w-24 h-24">
              <Image src={logoUrl || "/placeholder.svg"} alt="Business Logo" fill className="object-contain" />
            </div>
          </div>
        )}

        {/* Header */}
        {showBusinessName && (
          <div className="text-center mb-4">
            <h1 className="text-lg font-bold">{businessName}</h1>
            <p className="text-[10px]">{businessAddress}</p>
            <p className="text-[10px]">Tel: {businessPhone}</p>
          </div>
        )}

        <div className="border-t border-dashed border-black my-2" />

        {/* Order Info */}
        <div className="mb-3">
          <div className="flex justify-between">
            <span>Order #:</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Tarikh:</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          {order.cashier && (
            <div className="flex justify-between">
              <span>Cashier:</span>
              <span>{order.cashier.name}</span>
            </div>
          )}
          {order.customer && (
            <div className="flex justify-between">
              <span>Pelanggan:</span>
              <span>{order.customer.name}</span>
            </div>
          )}
          {order.customer_phone && (
            <div className="flex justify-between">
              <span>Telefon:</span>
              <span>
                {order.customer_country_code} {order.customer_phone}
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Items */}
        <div className="mb-3">
          {order.items?.map((item) => (
            <div key={item.id} className="mb-2">
              <div className="flex justify-between">
                <span className="flex-1">
                  {item.quantity}x {item.product_name}
                </span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="pl-3 text-[10px] text-gray-600">
                  {item.modifiers.map((m, idx) => (
                    <span key={idx}>
                      + {m.name}
                      {m.price > 0 && ` (${formatModifierPrice(m.price, "BND")})`}
                      {idx < item.modifiers.length - 1 && ", "}
                    </span>
                  ))}
                </div>
              )}
              {item.notes && <div className="pl-3 text-[10px] italic">Nota: {item.notes}</div>}
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Totals */}
        <div className="mb-3">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-700">
              <span>Diskaun:</span>
              <span>-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-sm mt-1">
            <span>JUMLAH:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Payment Info */}
        <div className="mb-3">
          <div className="flex justify-between">
            <span>Bayaran:</span>
            <span>
              {order.payment_method === "cash"
                ? "Tunai"
                : order.payment_method === "qrpay"
                  ? "QR Pay"
                  : order.payment_method === "bank_transfer"
                    ? "Bank Transfer"
                    : "Split"}
            </span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-2" />

        {/* Footer Image */}
        {showFooterImage && footerImageUrl && (
          <div className="flex justify-center my-3">
            <div className="relative w-full h-20">
              <Image src={footerImageUrl || "/placeholder.svg"} alt="Receipt Footer" fill className="object-contain" />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="font-bold">Terima Kasih!</p>
          <p className="text-[10px] mt-1">Sila datang lagi</p>
          <p className="text-[10px] mt-2 text-gray-500">--- {order.order_number} ---</p>
        </div>
      </div>
    )
  },
)

ReceiptTemplate.displayName = "ReceiptTemplate"
