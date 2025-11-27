"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Save, User, Briefcase, Building2, Clock, Receipt, Calendar, FileUp } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Employee, Attendance, Claim, LeaveApplication, LeaveBalance, EmployeeDocument } from "@/lib/types"
import { DocumentUpload } from "@/components/hr/document-upload"

export default function EmployeeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const isNew = params.id === "new"

  const [employee, setEmployee] = useState<Partial<Employee>>({
    name: "",
    position: "",
    salary_type: "monthly",
    salary_rate: 0,
    is_active: true,
    join_date: new Date().toISOString().split("T")[0],
  })
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [leaves, setLeaves] = useState<LeaveApplication[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [documents, setDocuments] = useState<EmployeeDocument[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkUserRole()
    if (!isNew) {
      loadEmployee()
    }
  }, [params.id])

  async function checkUserRole() {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
      setIsAdmin(data?.role === "admin")
    }
  }

  async function loadEmployee() {
    const supabase = createClient()

    const { data: emp } = await supabase.from("employees").select("*").eq("id", params.id).single()

    if (emp) {
      setEmployee(emp)

      const [attendanceRes, claimsRes, leavesRes, balanceRes, docsRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("*")
          .eq("employee_id", params.id)
          .order("clock_in", { ascending: false })
          .limit(20),
        supabase.from("claims").select("*").eq("employee_id", params.id).order("created_at", { ascending: false }),
        supabase
          .from("leave_applications")
          .select("*")
          .eq("employee_id", params.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("leave_balance")
          .select("*")
          .eq("employee_id", params.id)
          .eq("year", new Date().getFullYear())
          .single(),
        supabase
          .from("employee_documents")
          .select("*")
          .eq("employee_id", params.id)
          .order("created_at", { ascending: false }),
      ])

      setAttendance(attendanceRes.data || [])
      setClaims(claimsRes.data || [])
      setLeaves(leavesRes.data || [])
      setLeaveBalance(balanceRes.data)
      setDocuments(docsRes.data || [])
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!employee.name || !employee.position) {
      toast.error("Sila isi nama dan jawatan")
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      if (isNew) {
        const { data, error } = await supabase.from("employees").insert(employee).select().single()

        if (error) throw error

        await supabase.from("leave_balance").insert({
          employee_id: data.id,
          year: new Date().getFullYear(),
          annual_balance: 14,
          replacement_balance: 0,
          medical_balance: 14,
        })

        toast.success("Pekerja berjaya ditambah")
        router.push(`/hr/employees/${data.id}`)
      } else {
        const { error } = await supabase.from("employees").update(employee).eq("id", params.id)

        if (error) throw error
        toast.success("Profil berjaya dikemaskini")
      }
    } catch (error: any) {
      toast.error(error.message)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/hr/employees">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{isNew ? "Tambah Pekerja Baru" : employee.name}</h1>
              <p className="text-muted-foreground">{isNew ? "Isi maklumat pekerja baru" : `ID: ${params.id}`}</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              "Menyimpan..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" /> Simpan
              </>
            )}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="personal">
              <User className="h-4 w-4 mr-2 hidden sm:inline" />
              Peribadi
            </TabsTrigger>
            <TabsTrigger value="employment">
              <Briefcase className="h-4 w-4 mr-2 hidden sm:inline" />
              Pekerjaan
            </TabsTrigger>
            <TabsTrigger value="bank">
              <Building2 className="h-4 w-4 mr-2 hidden sm:inline" />
              Bank
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileUp className="h-4 w-4 mr-2 hidden sm:inline" />
              Dokumen
            </TabsTrigger>
            {!isNew && (
              <TabsTrigger value="attendance">
                <Clock className="h-4 w-4 mr-2 hidden sm:inline" />
                Kehadiran
              </TabsTrigger>
            )}
            {!isNew && (
              <TabsTrigger value="claims">
                <Receipt className="h-4 w-4 mr-2 hidden sm:inline" />
                Tuntutan
              </TabsTrigger>
            )}
            {!isNew && (
              <TabsTrigger value="leave">
                <Calendar className="h-4 w-4 mr-2 hidden sm:inline" />
                Cuti
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Maklumat Peribadi</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Penuh *</Label>
                  <Input
                    value={employee.name || ""}
                    onChange={(e) => setEmployee({ ...employee, name: e.target.value })}
                    placeholder="Nama penuh"
                  />
                </div>
                <div className="space-y-2">
                  <Label>No. IC</Label>
                  <Input
                    value={employee.ic_number || ""}
                    onChange={(e) => setEmployee({ ...employee, ic_number: e.target.value })}
                    placeholder="Contoh: 901231-01-1234"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jantina</Label>
                  <Select
                    value={employee.gender || ""}
                    onValueChange={(v) => setEmployee({ ...employee, gender: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jantina" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Lelaki</SelectItem>
                      <SelectItem value="female">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tarikh Lahir</Label>
                  <Input
                    type="date"
                    value={employee.date_of_birth || ""}
                    onChange={(e) => setEmployee({ ...employee, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kewarganegaraan</Label>
                  <Input
                    value={employee.nationality || ""}
                    onChange={(e) => setEmployee({ ...employee, nationality: e.target.value })}
                    placeholder="Contoh: Warganegara Brunei"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bangsa</Label>
                  <Select value={employee.race || ""} onValueChange={(v) => setEmployee({ ...employee, race: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bangsa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="melayu">Melayu</SelectItem>
                      <SelectItem value="cina">Cina</SelectItem>
                      <SelectItem value="dusun">Dusun</SelectItem>
                      <SelectItem value="murut">Murut</SelectItem>
                      <SelectItem value="kedayan">Kedayan</SelectItem>
                      <SelectItem value="iban">Iban</SelectItem>
                      <SelectItem value="india">India</SelectItem>
                      <SelectItem value="lain">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Agama</Label>
                  <Select
                    value={employee.religion || ""}
                    onValueChange={(v) => setEmployee({ ...employee, religion: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih agama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="islam">Islam</SelectItem>
                      <SelectItem value="christian">Kristian</SelectItem>
                      <SelectItem value="buddhist">Buddha</SelectItem>
                      <SelectItem value="hindu">Hindu</SelectItem>
                      <SelectItem value="other">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status Perkahwinan</Label>
                  <Select
                    value={employee.marital_status || ""}
                    onValueChange={(v) => setEmployee({ ...employee, marital_status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Bujang</SelectItem>
                      <SelectItem value="married">Berkahwin</SelectItem>
                      <SelectItem value="divorced">Bercerai</SelectItem>
                      <SelectItem value="widowed">Balu/Duda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>No. Telefon</Label>
                  <Input
                    value={employee.phone || ""}
                    onChange={(e) => setEmployee({ ...employee, phone: e.target.value })}
                    placeholder="Contoh: +673 8123456"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={employee.email || ""}
                    onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
                    placeholder="email@contoh.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Alamat</Label>
                  <Textarea
                    value={employee.address || ""}
                    onChange={(e) => setEmployee({ ...employee, address: e.target.value })}
                    placeholder="Alamat penuh"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nama Waris Kecemasan</Label>
                  <Input
                    value={employee.emergency_contact_name || ""}
                    onChange={(e) => setEmployee({ ...employee, emergency_contact_name: e.target.value })}
                    placeholder="Nama waris kecemasan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>No. Telefon Kecemasan</Label>
                  <Input
                    value={employee.emergency_contact_phone || ""}
                    onChange={(e) => setEmployee({ ...employee, emergency_contact_phone: e.target.value })}
                    placeholder="No. telefon waris"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle>Maklumat Pekerjaan</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jawatan *</Label>
                  <Input
                    value={employee.position || ""}
                    onChange={(e) => setEmployee({ ...employee, position: e.target.value })}
                    placeholder="Contoh: Cashier, Cook, Waiter"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jenis Gaji</Label>
                  <Select
                    value={employee.salary_type || "monthly"}
                    onValueChange={(v) => setEmployee({ ...employee, salary_type: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Bulanan</SelectItem>
                      <SelectItem value="hourly">Mengikut Jam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Kadar Gaji (BND)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={employee.salary_rate?.toFixed(2) || "0.00"}
                    onChange={(e) => setEmployee({ ...employee, salary_rate: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tarikh Mula Bekerja</Label>
                  <Input
                    type="date"
                    value={employee.join_date || ""}
                    onChange={(e) => setEmployee({ ...employee, join_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tarikh Tamat (jika ada)</Label>
                  <Input
                    type="date"
                    value={employee.employment_end_date || ""}
                    onChange={(e) => setEmployee({ ...employee, employment_end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status Aktif</Label>
                  <div className="flex items-center gap-2 pt-2">
                    <Switch
                      checked={employee.is_active}
                      onCheckedChange={(v) => setEmployee({ ...employee, is_active: v })}
                    />
                    <span className="text-sm text-muted-foreground">
                      {employee.is_active ? "Aktif" : "Tidak Aktif"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Bank Tab */}
          <TabsContent value="bank">
            <Card>
              <CardHeader>
                <CardTitle>Maklumat Bank</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nama Bank</Label>
                  <Select
                    value={employee.bank_name || ""}
                    onValueChange={(v) => setEmployee({ ...employee, bank_name: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih bank" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BIBD">BIBD</SelectItem>
                      <SelectItem value="Baiduri">Baiduri Bank</SelectItem>
                      <SelectItem value="SCB">Standard Chartered</SelectItem>
                      <SelectItem value="Maybank">Maybank</SelectItem>
                      <SelectItem value="other">Lain-lain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nama Penama Akaun</Label>
                  <Input
                    value={employee.penama_akaun || employee.account_name || ""}
                    onChange={(e) =>
                      setEmployee({ ...employee, penama_akaun: e.target.value, account_name: e.target.value })
                    }
                    placeholder="Nama pada akaun bank"
                  />
                </div>
                <div className="space-y-2">
                  <Label>No. Akaun</Label>
                  <Input
                    value={employee.account_number || ""}
                    onChange={(e) => setEmployee({ ...employee, account_number: e.target.value })}
                    placeholder="Nombor akaun bank"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-6">
            {isNew ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Sila simpan maklumat pekerja terlebih dahulu sebelum memuat naik dokumen.
                </CardContent>
              </Card>
            ) : (
              <DocumentUpload
                employeeId={params.id as string}
                documents={documents}
                onDocumentsChange={setDocuments}
                isAdmin={isAdmin}
              />
            )}
          </TabsContent>

          {/* Attendance Tab */}
          {!isNew && (
            <TabsContent value="attendance">
              <Card>
                <CardHeader>
                  <CardTitle>Rekod Kehadiran (20 Terkini)</CardTitle>
                </CardHeader>
                <CardContent>
                  {attendance.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Tiada rekod kehadiran</p>
                  ) : (
                    <div className="space-y-2">
                      {attendance.map((a) => (
                        <div key={a.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{new Date(a.clock_in).toLocaleDateString("ms-MY")}</p>
                            <p className="text-sm text-muted-foreground">
                              Masuk:{" "}
                              {new Date(a.clock_in).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}
                              {a.clock_out &&
                                ` - Keluar: ${new Date(a.clock_out).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}`}
                            </p>
                            {a.ot_clock_in && (
                              <p className="text-xs text-orange-600">
                                OT:{" "}
                                {new Date(a.ot_clock_in).toLocaleTimeString("ms-MY", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {a.ot_clock_out &&
                                  ` - ${new Date(a.ot_clock_out).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" })}`}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{a.total_hours?.toFixed(1) || "0"} jam</p>
                            {a.overtime_hours > 0 && (
                              <Badge variant="outline" className="bg-orange-500/10 text-orange-600">
                                OT: {a.overtime_hours.toFixed(1)} jam
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Claims Tab */}
          {!isNew && (
            <TabsContent value="claims">
              <Card>
                <CardHeader>
                  <CardTitle>Tuntutan</CardTitle>
                </CardHeader>
                <CardContent>
                  {claims.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Tiada rekod tuntutan</p>
                  ) : (
                    <div className="space-y-2">
                      {claims.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{c.claim_type === "mileage" ? "Mileage" : "Lain-lain"}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(c.claim_date).toLocaleDateString("ms-MY")} - {c.place_route || "N/A"}
                            </p>
                            {c.distance_km && <p className="text-xs text-muted-foreground">{c.distance_km} km</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-medium">BND {c.amount.toFixed(2)}</p>
                            <Badge
                              variant={
                                c.status === "approved"
                                  ? "default"
                                  : c.status === "rejected"
                                    ? "destructive"
                                    : "outline"
                              }
                            >
                              {c.status === "approved" ? "Diluluskan" : c.status === "rejected" ? "Ditolak" : "Pending"}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Leave Tab */}
          {!isNew && (
            <TabsContent value="leave">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Baki Cuti {new Date().getFullYear()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">{leaveBalance?.annual_balance || 14}</p>
                        <p className="text-sm text-muted-foreground">Cuti Tahunan</p>
                      </div>
                      <div className="text-center p-4 bg-green-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">{leaveBalance?.replacement_balance || 0}</p>
                        <p className="text-sm text-muted-foreground">Cuti Ganti</p>
                      </div>
                      <div className="text-center p-4 bg-red-500/10 rounded-lg">
                        <p className="text-2xl font-bold text-red-600">{leaveBalance?.medical_balance || 14}</p>
                        <p className="text-sm text-muted-foreground">Cuti Sakit</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Permohonan Cuti</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {leaves.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">Tiada permohonan cuti</p>
                    ) : (
                      <div className="space-y-2">
                        {leaves.map((l) => (
                          <div key={l.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                            <div>
                              <p className="font-medium capitalize">
                                {l.leave_type === "annual"
                                  ? "Tahunan"
                                  : l.leave_type === "replacement"
                                    ? "Ganti"
                                    : l.leave_type === "medical"
                                      ? "Sakit"
                                      : l.leave_type === "paid_leave"
                                        ? "Bergaji"
                                        : l.leave_type === "unpaid_leave"
                                          ? "Tanpa Gaji"
                                          : l.leave_type}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(l.start_date).toLocaleDateString("ms-MY")} -{" "}
                                {new Date(l.end_date).toLocaleDateString("ms-MY")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{l.total_days} hari</p>
                              <Badge
                                variant={
                                  l.status === "approved"
                                    ? "default"
                                    : l.status === "rejected"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {l.status === "approved"
                                  ? "Diluluskan"
                                  : l.status === "rejected"
                                    ? "Ditolak"
                                    : "Pending"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppShell>
  )
}
