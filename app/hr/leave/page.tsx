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
import { Plus, Check, X, Download, Calendar } from "lucide-react"
import { toast } from "sonner"
import type { LeaveApplication, LeaveBalance, Employee, User } from "@/lib/types"

type LeaveType = "annual" | "replacement" | "medical" | "paid_leave" | "unpaid_leave"

export default function LeavePage() {
  const [applications, setApplications] = useState<(LeaveApplication & { employee?: Employee })[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [balances, setBalances] = useState<(LeaveBalance & { employee?: Employee })[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newLeave, setNewLeave] = useState({
    employee_id: "",
    leave_type: "annual" as LeaveType,
    start_date: "",
    end_date: "",
    total_days: 0,
    reason: "",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    if (authUser) {
      const { data: userData } = await supabase.from("users").select("*").eq("id", authUser.id).single()
      setUser(userData)
      setIsAdmin(userData?.role === "admin")
    }

    const { data: apps } = await supabase
      .from("leave_applications")
      .select("*, employee:employees(name)")
      .order("created_at", { ascending: false })

    setApplications(apps || [])

    const { data: empData } = await supabase.from("employees").select("id, name").eq("is_active", true).order("name")
    setEmployees(empData || [])

    const { data: balData } = await supabase
      .from("leave_balance")
      .select("*, employee:employees(name)")
      .eq("year", new Date().getFullYear())
    setBalances(balData || [])

    setLoading(false)
  }

  function calculateDays(start: string, end: string): number {
    if (!start || !end) return 0
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  async function handleSubmitLeave() {
    if (!newLeave.employee_id || !newLeave.start_date || !newLeave.end_date) {
      toast.error("Sila lengkapkan maklumat permohonan")
      return
    }

    // Check balance for paid leave types
    const balance = balances.find((b) => b.employee_id === newLeave.employee_id)
    if (balance && newLeave.leave_type !== "unpaid_leave") {
      const balanceField =
        newLeave.leave_type === "paid_leave"
          ? "annual_balance"
          : (`${newLeave.leave_type}_balance` as keyof LeaveBalance)
      const available = balance[balanceField] as number
      if (newLeave.total_days > available) {
        toast.error(`Baki cuti tidak mencukupi. Baki: ${available} hari`)
        return
      }
    }

    const supabase = createClient()
    const { error } = await supabase.from("leave_applications").insert({
      ...newLeave,
      application_date: new Date().toISOString().split("T")[0],
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Permohonan cuti berjaya dihantar")
      setDialogOpen(false)
      setNewLeave({
        employee_id: "",
        leave_type: "annual",
        start_date: "",
        end_date: "",
        total_days: 0,
        reason: "",
      })
      loadData()
    }
  }

  async function handleApprove(app: LeaveApplication) {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const { error: appError } = await supabase
      .from("leave_applications")
      .update({ status: "approved", approved_by: authUser?.id, approved_at: new Date().toISOString() })
      .eq("id", app.id)

    if (appError) {
      toast.error(appError.message)
      return
    }

    // Deduct balance if not unpaid leave
    if (app.leave_type !== "unpaid_leave") {
      const balanceField = app.leave_type === "paid_leave" ? "annual_balance" : `${app.leave_type}_balance`
      const balance = balances.find((b) => b.employee_id === app.employee_id)
      if (balance) {
        const currentBalance = (balance as any)[balanceField] as number
        await supabase
          .from("leave_balance")
          .update({ [balanceField]: currentBalance - app.total_days })
          .eq("id", balance.id)
      }
    }

    toast.success("Permohonan cuti diluluskan")
    loadData()
  }

  async function handleReject(appId: string) {
    const supabase = createClient()
    const { error } = await supabase.from("leave_applications").update({ status: "rejected" }).eq("id", appId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Permohonan cuti ditolak")
      loadData()
    }
  }

  function exportCSV() {
    const headers = ["Tarikh Mohon", "Pekerja", "Jenis", "Dari", "Hingga", "Jumlah Hari", "Status"]
    const rows = filteredApplications.map((a) => [
      a.application_date,
      a.employee?.name || "",
      leaveTypeLabels[a.leave_type],
      a.start_date,
      a.end_date,
      a.total_days.toString(),
      a.status,
    ])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leave_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  const filteredApplications = applications.filter((a) => filter === "all" || a.status === filter)

  const leaveTypeLabels: Record<string, string> = {
    annual: "Cuti Tahunan",
    replacement: "Cuti Ganti",
    medical: "Cuti Sakit",
    paid_leave: "Cuti Bergaji",
    unpaid_leave: "Cuti Tanpa Gaji",
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Permohonan Cuti</h1>
            <p className="text-muted-foreground">Urus cuti pekerja</p>
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
                  Mohon Cuti
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Permohonan Cuti Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Pekerja</Label>
                    <Select
                      value={newLeave.employee_id}
                      onValueChange={(v) => setNewLeave({ ...newLeave, employee_id: v })}
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
                    {newLeave.employee_id && (
                      <div className="text-xs text-muted-foreground">
                        {(() => {
                          const bal = balances.find((b) => b.employee_id === newLeave.employee_id)
                          if (bal) {
                            return `Baki: Tahunan ${bal.annual_balance}, Ganti ${bal.replacement_balance}, Sakit ${bal.medical_balance}`
                          }
                          return ""
                        })()}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Jenis Cuti</Label>
                    <Select
                      value={newLeave.leave_type}
                      onValueChange={(v: LeaveType) => setNewLeave({ ...newLeave, leave_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="annual">Cuti Tahunan</SelectItem>
                        <SelectItem value="replacement">Cuti Ganti</SelectItem>
                        <SelectItem value="medical">Cuti Sakit</SelectItem>
                        <SelectItem value="paid_leave">Cuti Bergaji</SelectItem>
                        <SelectItem value="unpaid_leave">Cuti Tanpa Gaji</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tarikh Mula</Label>
                      <Input
                        type="date"
                        value={newLeave.start_date}
                        onChange={(e) => {
                          const days = calculateDays(e.target.value, newLeave.end_date)
                          setNewLeave({ ...newLeave, start_date: e.target.value, total_days: days })
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tarikh Tamat</Label>
                      <Input
                        type="date"
                        value={newLeave.end_date}
                        onChange={(e) => {
                          const days = calculateDays(newLeave.start_date, e.target.value)
                          setNewLeave({ ...newLeave, end_date: e.target.value, total_days: days })
                        }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Jumlah Hari: <span className="font-bold">{newLeave.total_days}</span>
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Sebab</Label>
                    <Textarea
                      value={newLeave.reason}
                      onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleSubmitLeave}>Hantar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Jumlah Permohonan</p>
              <p className="text-2xl font-bold">{applications.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {applications.filter((a) => a.status === "pending").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Diluluskan</p>
              <p className="text-2xl font-bold text-green-600">
                {applications.filter((a) => a.status === "approved").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Ditolak</p>
              <p className="text-2xl font-bold text-red-600">
                {applications.filter((a) => a.status === "rejected").length}
              </p>
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

        {/* Applications List */}
        <div className="space-y-3">
          {filteredApplications.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium">{app.employee?.name}</p>
                      <p className="text-sm text-muted-foreground">{leaveTypeLabels[app.leave_type]}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(app.start_date).toLocaleDateString("ms-MY")} -{" "}
                        {new Date(app.end_date).toLocaleDateString("ms-MY")}
                      </p>
                      {app.reason && <p className="text-xs text-muted-foreground mt-1">{app.reason}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{app.total_days} hari</p>
                    <Badge
                      variant={
                        app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "outline"
                      }
                      className={app.status === "pending" ? "bg-yellow-500/10 text-yellow-600" : ""}
                    >
                      {app.status === "approved" ? "Diluluskan" : app.status === "rejected" ? "Ditolak" : "Pending"}
                    </Badge>
                    {isAdmin && app.status === "pending" && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleReject(app.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleApprove(app)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredApplications.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Tiada permohonan cuti</div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
