"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Phone, User, ShoppingBag, Calendar, DollarSign } from "lucide-react"
import Link from "next/link"

interface Customer {
  id: string
  name: string | null
  phone: string
  order_count: number
  total_spent: number
  last_visit: string | null
  created_at: string
}

interface Order {
  id: string
  order_number: string
  order_type: string
  total: number
  payment_method: string
  status: string
  created_at: string
  order_items: {
    id: string
    quantity: number
    unit_price: number
    product: { name: string } | null
  }[]
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const supabase = createClient()

    // Fetch customer
    const { data: customerData } = await supabase.from("customers").select("*").eq("id", params.id).single()

    if (customerData) {
      setCustomer(customerData)

      // Fetch customer orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select(`
          id,
          order_number,
          order_type,
          total,
          payment_method,
          status,
          created_at,
          order_items (
            id,
            quantity,
            unit_price,
            product:products (name)
          )
        `)
        .eq("customer_id", params.id)
        .order("created_at", { ascending: false })
        .limit(50)

      setOrders(ordersData || [])
    }

    setLoading(false)
  }, [params.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ms-BN", {
      style: "currency",
      currency: "BND",
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ms-MY", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    )
  }

  if (!customer) {
    return (
      <AppShell>
        <div className="p-6">
          <p>Pelanggan tidak dijumpai</p>
          <Link href="/customers">
            <Button variant="outline" className="mt-4 bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali
            </Button>
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{customer.name || "Pelanggan"}</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              {customer.phone}
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Pesanan</p>
                  <p className="text-2xl font-bold">{customer.order_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/10">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Jumlah Belanja</p>
                  <p className="text-2xl font-bold">{formatCurrency(customer.total_spent || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lawatan Terakhir</p>
                  <p className="text-lg font-semibold">
                    {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString("ms-MY") : "-"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-purple-500/10">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ahli Sejak</p>
                  <p className="text-lg font-semibold">{new Date(customer.created_at).toLocaleDateString("ms-MY")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order History */}
        <Card>
          <CardHeader>
            <CardTitle>Sejarah Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Tiada sejarah pesanan</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Pesanan</TableHead>
                    <TableHead>Tarikh</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                      <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.order_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.order_items.slice(0, 2).map((item, i) => (
                            <div key={item.id} className="text-muted-foreground">
                              {item.quantity}x {item.product?.name || "Item"}
                            </div>
                          ))}
                          {order.order_items.length > 2 && (
                            <span className="text-xs text-muted-foreground">+{order.order_items.length - 2} lagi</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.payment_method}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(order.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
