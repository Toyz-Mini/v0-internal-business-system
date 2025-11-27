"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Phone, User, ShoppingBag, Calendar, DollarSign, FileText, Edit, Save, X } from "lucide-react"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Customer {
  id: string
  name: string | null
  phone: string
  order_count: number
  total_spent: number
  last_visit: string | null
  created_at: string
  notes: string | null
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
  const [editingNotes, setEditingNotes] = useState(false)
  const [notes, setNotes] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const customerResponse = await fetch(`/api/customers/${params.id}`)
      const customerData = await customerResponse.json()

      if (customerData.success && customerData.data) {
        setCustomer(customerData.data)
        setNotes(customerData.data.notes || "")

        const ordersResponse = await fetch(`/api/customers/${params.id}/orders`)
        const ordersData = await ordersResponse.json()

        if (ordersData.success) {
          setOrders(ordersData.data || [])
        }
      }
    } catch (error) {
      console.error("Failed to fetch customer data:", error)
    } finally {
      setLoading(false)
    }
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

  const handleSaveNotes = async () => {
    if (!customer) return

    setSavingNotes(true)
    try {
      const response = await fetch(`/api/customers/${customer.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Gagal simpan notes")
      }

      setCustomer({ ...customer, notes })
      setEditingNotes(false)
      toast.success("Notes berjaya dikemaskini")
    } catch (error: any) {
      console.error("Save notes error:", error)
      toast.error(error.message || "Gagal simpan notes")
    } finally {
      setSavingNotes(false)
    }
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

        {/* Customer Notes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes Pelanggan
              </CardTitle>
              {!editingNotes ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingNotes(true)}
                  className="bg-transparent"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingNotes(false)
                      setNotes(customer?.notes || "")
                    }}
                    disabled={savingNotes}
                    className="bg-transparent"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {savingNotes ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editingNotes ? (
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tambah notes tentang pelanggan ini (contoh: VIP, suka pedas, alergi seafood)"
                rows={4}
                className="w-full"
              />
            ) : (
              <div className="min-h-[100px]">
                {customer?.notes ? (
                  <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Tiada notes. Klik "Edit" untuk menambah notes tentang pelanggan ini.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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
