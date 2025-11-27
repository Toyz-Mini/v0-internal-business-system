"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { CartItem, Customer, SplitPayment } from "@/lib/types"
import { useNetworkStatus } from "@/lib/hooks/use-network-status"
import { ReceiptTemplate } from "./receipt-template"
import { useReactToPrint } from "react-to-print"
import { formatCurrency } from "@/lib/ux-utils"
import { Minus, Plus, Trash2 } from "lucide-react"

const COUNTRY_CODES = [
  { code: "+673", country: "Brunei" },
  { code: "+60", country: "Malaysia" },
  { code: "+65", country: "Singapore" },
  { code: "+62", country: "Indonesia" },
  { code: "+63", country: "Philippines" },
]

interface CartProps {
  items: CartItem[]
  customers: Customer[]
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer | null) => void
  onUpdateQuantity: (index: number, quantity: number) => void
  onRemoveItem: (index: number) => void
  onUpdateItemNotes: (index: number, notes: string) => void
  onUpdateItemDiscount: (index: number, type: "percentage" | "fixed" | null, value: number) => void
  onClearCart: () => void
  cashierId?: string
  onOrderComplete?: () => void
  userRole?: string
}

export function Cart({
  items,
  customers,
  selectedCustomer,
  onSelectCustomer,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemNotes,
  onUpdateItemDiscount,
  onClearCart,
  cashierId,
  onOrderComplete,
  userRole = "cashier",
}: CartProps) {
  const [showPayment, setShowPayment] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qrpay" | "bank_transfer" | "split">("cash")
  const [amountReceived, setAmountReceived] = useState("")
  const [discountType, setDiscountType] = useState<"percentage" | "fixed" | null>(null)
  const [discountValue, setDiscountValue] = useState(0)
  const [orderNotes, setOrderNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderNumber, setOrderNumber] = useState("")
  const [customerOpen, setCustomerOpen] = useState(false)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null)

  const [sourceType, setSourceType] = useState<"takeaway" | "gomamam">("takeaway")

  const [customerCountryCode, setCustomerCountryCode] = useState("+673")
  const [customerPhone, setCustomerPhone] = useState("")
  const [detectedCustomer, setDetectedCustomer] = useState<Customer | null>(null)

  const networkStatus = useNetworkStatus()
  const lastSubmitTimeRef = useRef<number>(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const quickAmounts = [10, 20, 50, 100]

  const receiptRef = useRef<HTMLDivElement>(null)
  const [receiptSettings, setReceiptSettings] = useState<any>(null)
  const [completedOrder, setCompletedOrder] = useState<any>(null)

  useEffect(() => {
    const fetchReceiptSettings = async () => {
      const supabase = createClient()
      const { data } = await supabase.from("settings").select("*").single()
      setReceiptSettings(data)
    }
    fetchReceiptSettings()
  }, [])

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: completedOrder?.order_number || "Receipt",
    onAfterPrint: () => {
      console.log("[v0] Receipt printed successfully")
    },
  })

  useEffect(() => {
    if (customerPhone.length >= 7) {
      const fullPhone = `${customerCountryCode}${customerPhone}`
      const found = customers.find((c) => c.phone?.includes(customerPhone) || c.phone === fullPhone)
      setDetectedCustomer(found || null)
      if (found) {
        onSelectCustomer(found)
      }
    } else {
      setDetectedCustomer(null)
    }
  }, [customerPhone, customerCountryCode, customers])

  const calculateItemTotal = (item: CartItem) => {
    const modifierTotal = item.modifiers.reduce((sum, mod) => sum + mod.price, 0)
    const baseTotal = (item.product.price + modifierTotal) * item.quantity

    if (item.discount_type === "percentage") {
      return baseTotal * (1 - (item.discount_amount || 0) / 100)
    } else if (item.discount_type === "fixed") {
      return Math.max(0, baseTotal - (item.discount_amount || 0))
    }
    return baseTotal
  }

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + calculateItemTotal(item), 0), [items])

  const discountAmount = useMemo(() => {
    if (!discountType) return 0
    if (discountType === "percentage") {
      return subtotal * (discountValue / 100)
    }
    return discountValue
  }, [subtotal, discountType, discountValue])

  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount])

  const change = useMemo(() => {
    const received = Number.parseFloat(amountReceived) || 0
    return Math.max(0, received - total)
  }, [amountReceived, total])

  // Split payment calculations
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([])
  const [splitMethod, setSplitMethod] = useState<"cash" | "qrpay" | "bank_transfer">("cash")
  const [splitAmount, setSplitAmount] = useState("")
  const splitRemaining = useMemo(
    () => total - splitPayments.reduce((sum, payment) => sum + payment.amount, 0),
    [total, splitPayments],
  )

  const addSplitPayment = () => {
    const amount = Number.parseFloat(splitAmount)
    if (!amount || amount <= 0) return

    const actualAmount = Math.min(amount, splitRemaining)
    setSplitPayments((prev) => [...prev, { method: splitMethod, amount: actualAmount }])
    setSplitAmount("")
  }

  const removeSplitPayment = (index: number) => {
    setSplitPayments((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCheckout = async () => {
    if (items.length === 0) {
      setSubmitError("Keranjang kosong. Sila tambah item terlebih dahulu.")
      return
    }

    if (!networkStatus.isOnline) {
      setSubmitError("Tiada sambungan internet. Sila cuba semula.")
      return
    }

    const now = Date.now()
    if (now - lastSubmitTimeRef.current < 2000) {
      console.log("[v0] Checkout blocked - too soon after last attempt")
      return
    }

    if (paymentMethod === "split" && splitRemaining > 0.01) {
      setSubmitError("Sila lengkapkan split payment")
      return
    }

    lastSubmitTimeRef.current = now
    setIsProcessing(true)
    setSubmitError(null)

    try {
      let customerId = selectedCustomer?.id || null

      if (customerPhone && !selectedCustomer) {
        const fullPhone = `${customerCountryCode}${customerPhone}`
        const supabase = createClient()
        const { data: newCustomer, error: customerError } = await supabase
          .from("customers")
          .insert({
            name: `Customer ${fullPhone}`,
            phone: fullPhone,
            tags: [],
            order_count: 0,
            total_spent: 0,
          })
          .select()
          .single()

        if (!customerError && newCustomer) {
          customerId = newCustomer.id
        }
      }

      const orderData = {
        customer_id: customerId,
        employee_id: cashierId,
        order_type: sourceType === "gomamam" ? "delivery" : "takeaway",
        items: items.map((item) => ({
          product_id: item.product.id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.product.price,
          modifiers: item.modifiers.length > 0 ? item.modifiers : undefined,
          notes: item.notes || undefined,
        })),
        payment_method: paymentMethod,
        notes: orderNotes || undefined,
        discount_amount: discountAmount > 0 ? discountAmount : undefined,
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.details || result.error || "Gagal membuat order")
      }

      if (selectedCustomer) {
        const supabase = createClient()
        await supabase
          .from("customers")
          .update({
            order_count: selectedCustomer.order_count + 1,
            total_spent: selectedCustomer.total_spent + total,
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedCustomer.id)
      }

      const orderWithItems = {
        ...result.data.order,
        items: result.data.items,
      }
      setCompletedOrder(orderWithItems)
      setOrderNumber(result.data.order.order_number)
      setShowPayment(false)
      setShowSuccess(true)

      if (receiptSettings?.auto_print) {
        setTimeout(() => handlePrint(), 500)
      }

      setTimeout(() => {
        setShowSuccess(false)
        onClearCart()
        setAmountReceived("")
        setDiscountType(null)
        setDiscountValue(0)
        setOrderNotes("")
        setSplitPayments([])
        setCustomerPhone("")
        setDetectedCustomer(null)
        setCompletedOrder(null)
        onOrderComplete?.()
      }, 2000)
    } catch (error: any) {
      console.error("[v0] Checkout error:", error)
      setSubmitError(error.message || "Ralat semasa checkout")
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (!showPayment) {
      setSubmitError(null)
    }
  }, [showPayment])

  return (
    <>
      <div className="flex flex-col h-full bg-card border-l">
        <div className="p-4 border-b space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Pesanan</h2>
            <Badge variant="outline">{items.length} item</Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant={sourceType === "takeaway" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSourceType("takeaway")}
            >
              {/* TakeAway icon */}
              TakeAway
            </Button>
            <Button
              variant={sourceType === "gomamam" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setSourceType("gomamam")}
            >
              {/* GoMAMAM icon */}
              GoMAMAM
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm">No. Telefon Pelanggan</Label>
            <div className="flex gap-2">
              <Select value={customerCountryCode} onValueChange={setCustomerCountryCode}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRY_CODES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="tel"
                placeholder="8888888"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, ""))}
                className="flex-1"
              />
            </div>
            {detectedCustomer && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                {/* DetectedCustomer icon */}
                Pelanggan: {detectedCustomer.name}
              </p>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              {/* No items icon */}
              <p>Tiada item dalam pesanan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-muted-foreground">{item.modifiers.map((m) => m.name).join(", ")}</p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-blue-600 mt-1">
                          {/* Item notes icon */}
                          {item.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => onRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={() => onUpdateQuantity(index, Math.max(1, item.quantity - 1))}
                      >
                        <Minus className="h-4 w-4 text-foreground" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 bg-transparent"
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                      >
                        <Plus className="h-4 w-4 text-foreground" />
                      </Button>
                    </div>
                    <p className="font-semibold">{formatCurrency(calculateItemTotal(item))}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="border-t p-4 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subjumlah</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Diskaun</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Jumlah</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={items.length === 0} onClick={() => setShowPayment(true)}>
            Checkout
          </Button>
        </div>

        <Dialog open={showPayment} onOpenChange={setShowPayment}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Pembayaran</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Jenis Pesanan</span>
                  <Badge variant="outline">{sourceType === "takeaway" ? "TakeAway" : "GoMAMAM"}</Badge>
                </div>
                {customerPhone && (
                  <div className="flex justify-between text-sm">
                    <span>No. Telefon</span>
                    <span>
                      {customerCountryCode}
                      {customerPhone}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>Jumlah</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kaedah Pembayaran</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("cash")}
                    className="justify-start"
                  >
                    {/* Cash icon */}
                    Tunai
                  </Button>
                  <Button
                    variant={paymentMethod === "qrpay" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("qrpay")}
                    className="justify-start"
                  >
                    {/* QR Pay icon */}
                    QR Pay
                  </Button>
                  <Button
                    variant={paymentMethod === "bank_transfer" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("bank_transfer")}
                    className="justify-start"
                  >
                    {/* Bank Transfer icon */}
                    Bank
                  </Button>
                  <Button
                    variant={paymentMethod === "split" ? "default" : "outline"}
                    onClick={() => setPaymentMethod("split")}
                    className="justify-start"
                  >
                    {/* Split icon */}
                    Split
                  </Button>
                </div>
              </div>

              {paymentMethod === "cash" && (
                <div className="space-y-2">
                  <Label>Jumlah Diterima</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={amountReceived}
                    onChange={(e) => setAmountReceived(e.target.value)}
                    placeholder="0.00"
                  />
                  <div className="flex gap-2">
                    {quickAmounts.map((amt) => (
                      <Button key={amt} variant="outline" size="sm" onClick={() => setAmountReceived(amt.toString())}>
                        {amt}
                      </Button>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => setAmountReceived(total.toFixed(2))}>
                      Tepat
                    </Button>
                  </div>
                  {change > 0 && <p className="text-lg font-bold text-green-600">Baki: {formatCurrency(change)}</p>}
                </div>
              )}

              {submitError && (
                <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-2 rounded">
                  {/* Error icon */}
                  {submitError}
                </div>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing || !networkStatus.isOnline}
              >
                {isProcessing ? (
                  <>
                    {/* Processing icon */}
                    Memproses...
                  </>
                ) : !networkStatus.isOnline ? (
                  <>
                    {/* No internet icon */}
                    Tiada Internet
                  </>
                ) : (
                  `Bayar ${formatCurrency(total)}`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                {/* Success icon */}
                Order Berjaya!
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-lg font-bold">Order #{orderNumber}</p>
                <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(total)}</p>
                {paymentMethod === "cash" && Number.parseFloat(amountReceived) > total && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Baki</p>
                    <p className="text-xl font-bold text-blue-600">
                      {formatCurrency(Number.parseFloat(amountReceived) - total)}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-transparent" variant="outline" onClick={handlePrint}>
                  {/* Print icon */}
                  Print Resit
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    setShowSuccess(false)
                    onClearCart()
                  }}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {completedOrder && (
        <div className="hidden print:block">
          <ReceiptTemplate
            ref={receiptRef}
            order={completedOrder}
            businessName={receiptSettings?.business_name}
            businessAddress={receiptSettings?.business_address}
            businessPhone={receiptSettings?.business_phone}
            logoUrl={receiptSettings?.receipt_logo_url}
            footerImageUrl={receiptSettings?.receipt_footer_image_url}
            showLogo={receiptSettings?.show_logo ?? true}
            showBusinessName={receiptSettings?.show_business_name ?? true}
            showFooterImage={receiptSettings?.show_footer_image ?? false}
            showItemImages={receiptSettings?.show_item_images ?? false}
            receiptWidth={receiptSettings?.receipt_width_mm || 80}
          />
        </div>
      )}
    </>
  )
}
