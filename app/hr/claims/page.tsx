"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Check, X, Download, FileText, Car } from "lucide-react"
import { toast } from "sonner"
import type { Claim, Employee, User } from "@/lib/types"

const MILEAGE_RATE = 0.25 // BND per km

export default function ClaimsPage() {
  const [claims, setClaims] = useState<(Claim & { employee?: Employee })[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newClaim, setNewClaim] = useState({
    employee_id: "",
    claim_type: "mileage" as "mileage" | "other",
    claim_date: new Date().toISOString().split("T")[0],
    distance_km: 0,
    amount: 0,
    place_route: "",
    notes: "",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    // Get current user
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser) {
      const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()
      setUser(userData)
      setIsAdmin(userData?.role === "admin")
    }

    // Load claims with employee info
    const { data: claimsData } = await supabase
      .from("claims")
      .select("*, employee:employees(name)")
      .order("created_at", { ascending: false })

    setClaims(claimsData || [])

    // Load employees for dropdown
    const { data: empData } = await supabase.from("employees").select("id, name").eq("is_active", true).order("name")
    setEmployees(empData || [])

    setLoading(false)
  }

  async function handleSubmitClaim() {
    if (!newClaim.employee_id || newClaim.amount <= 0) {
      toast.error("Sila lengkapkan maklumat tuntutan")
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("claims").insert({
      ...newClaim,
      distance_km: newClaim.claim_type === "mileage" ? newClaim.distance_km : null,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Tuntutan berjaya dihantar")
      setDialogOpen(false)
      setNewClaim({
        employee_id: "",
        claim_type: "mileage",
        claim_date: new Date().toISOString().split("T")[0],
        distance_km: 0,
        amount: 0,
        place_route: "",
        notes: "",
      })
      loadData()
    }
  }

  async function handleApprove(claimId: string) {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("claims")
      .update({ status: "approved", approved_by: authUser?.id, approved_at: new Date().toISOString() })
      .eq("id", claimId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Tuntutan diluluskan")
      loadData()
    }
  }

  async function handleReject(claimId: string) {
    const supabase = createClient()
    const { error } = await supabase.from("claims").update({ status: "rejected" }).eq("id", claimId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Tuntutan ditolak")
      loadData()
    }
  }

  function exportCSV() {
    const headers = ["Tarikh", "Pekerja", "Jenis", "Jarak (km)", "Jumlah (BND)", "Laluan", "Status"]
    const rows = filteredClaims.map((c) => [
      c.claim_date,
      c.employee?.name || "",
      c.claim_type === "mileage" ? "Mileage" : "Lain-lain",
      c.distance_km?.toString() || "",
      c.amount.toFixed(2),
      c.place_route || "",
      c.status,
    ])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `claims_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const filteredClaims = claims.filter((c) => filter === "all" || c.status === filter)
  const pendingTotal = claims.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0)
  const approvedTotal = claims.filter((c) => c.status === "approved").reduce((sum, c) => sum + c.amount, 0)

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tuntutan</h1>
            <p className="text-muted-foreground">Urus tuntutan mileage & lain-lain</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Tuntutan Baru
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tuntutan Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pekerja</Label>
                    <Select
                      value={newClaim.employee_id}
                      onValueChange={(v) => setNewClaim({ ...newClaim, employee_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pekerja" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Jenis Tuntutan</Label>
                    <Select
                      value={newClaim.claim_type}
                      onValueChange={(v: "mileage" | "other") => {
                        setNewClaim({
                          ...newClaim,
                          claim_type: v,
                          amount: v === "mileage" ? newClaim.distance_km * MILEAGE_RATE : newClaim.amount,
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mileage">Mileage</SelectItem>
                        <SelectItem value="other">Lain-lain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tarikh</Label>
                    <Input
                      type="date"
                      value={newClaim.claim_date}
                      onChange={(e) => setNewClaim({ ...newClaim, claim_date: e.target.value })}
                    />
                  </div>
                  {newClaim.claim_type === "mileage" && (
                    <div className="space-y-2">
                      <Label>Jarak (km)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={newClaim.distance_km}
                        onChange={(e) => {
                          const km = Number.parseFloat(e.target.value) || 0
                          setNewClaim({ ...newClaim, distance_km: km, amount: km * MILEAGE_RATE })
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        Kadar: BND {MILEAGE_RATE}/km = BND {(newClaim.distance_km * MILEAGE_RATE).toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Jumlah (BND)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newClaim.amount}
                      onChange={(e) => setNewClaim({ ...newClaim, amount: Number.parseFloat(e.target.value) || 0 })}
                      disabled={newClaim.claim_type === "mileage"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Laluan / Tempat</Label>
                    <Input
                      value={newClaim.place_route}
                      onChange={(e) => setNewClaim({ ...newClaim, place_route: e.target.value })}
                      placeholder="Contoh: Bandar Seri Begawan - Tutong"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nota</Label>
                    <Textarea
                      value={newClaim.notes}
                      onChange={(e) => setNewClaim({ ...newClaim, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleSubmitClaim}>Hantar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Jumlah Tuntutan</p>
              <p className="text-2xl font-bold">{claims.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {claims.filter((c) => c.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending Amount</p>
              <p className="text-2xl font-bold text-yellow-600">BND {pendingTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Diluluskan</p>
              <p className="text-2xl font-bold text-green-600">BND {approvedTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Semua</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Diluluskan</TabsTrigger>
            <TabsTrigger value="rejected">Ditolak</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Claims List */}
        <div className="space-y-3">
          {filteredClaims.map((claim) => (
            <Card key={claim.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${claim.claim_type === "mileage" ? "bg-blue-500/10" : "bg-gray-500/10"}`}
                    >
                      {claim.claim_type === "mileage" ? (
                        <Car className="h-5 w-5 text-blue-500" />
                      ) : (
                        <FileText className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{claim.employee?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(claim.claim_date).toLocaleDateString("ms-MY")} -{" "}
                        {claim.claim_type === "mileage" ? "Mileage" : "Lain-lain"}
                      </p>
                      {claim.place_route && <p className="text-sm text-muted-foreground">{claim.place_route}</p>}
                      {claim.distance_km && <p className="text-xs text-muted-foreground">{claim.distance_km} km</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">BND {claim.amount.toFixed(2)}</p>
                    <Badge
                      variant={
                        claim.status === "approved"
                          ? "default"
                          : claim.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                      className={claim.status === "pending" ? "bg-yellow-500/10 text-yellow-600" : ""}
                    >
                      {claim.status === "approved" ? "Diluluskan" : claim.status === "rejected" ? "Ditolak" : "Pending"}
                    </Badge>
                    {isAdmin && claim.status === "pending" && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleReject(claim.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(claim.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredClaims.length === 0 && <div className="text-center py-12 text-muted-foreground">Tiada tuntutan</div>}
        </div>
      </div>
    </AppShell>
  )
}
