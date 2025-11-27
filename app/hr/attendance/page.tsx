"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Check, X, Download, Clock, Calendar, CameraIcon, MapPin } from "lucide-react"
import { toast } from "sonner"
import type { Attendance, Employee, User } from "@/lib/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CameraAttendance } from "@/components/hr/camera-attendance"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AttendancePage() {
  const [records, setRecords] = useState<(Attendance & { employee?: Employee })[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0])
  const [tab, setTab] = useState<"all" | "pending-ot">("all")
  const [loading, setLoading] = useState(true)
  const [showClockDialog, setShowClockDialog] = useState(false)
  const [clockType, setClockType] = useState<"clock_in" | "clock_out">("clock_in")
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("")
  const [currentAttendanceId, setCurrentAttendanceId] = useState<string | undefined>()
  const [showPhotoDialog, setShowPhotoDialog] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [dateFilter])

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

    const { data: employeesData } = await supabase.from("employees").select("*").eq("is_active", true).order("name")
    setEmployees(employeesData || [])

    const { data } = await supabase
      .from("attendance")
      .select("*, employee:employees(name, position)")
      .gte("clock_in", `${dateFilter}T00:00:00`)
      .lte("clock_in", `${dateFilter}T23:59:59`)
      .order("clock_in", { ascending: false })

    setRecords(data || [])
    setLoading(false)
  }

  async function handleApproveOT(recordId: string) {
    const supabase = createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from("attendance")
      .update({ ot_approved: true, approved_by: authUser?.id })
      .eq("id", recordId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("OT diluluskan")
      loadData()
    }
  }

  async function handleRejectOT(recordId: string) {
    const supabase = createClient()

    const { error } = await supabase
      .from("attendance")
      .update({ ot_clock_in: null, ot_clock_out: null, overtime_hours: 0 })
      .eq("id", recordId)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success("OT ditolak")
      loadData()
    }
  }

  function exportCSV() {
    const headers = ["Tarikh", "Pekerja", "Jawatan", "Masuk", "Keluar", "Jumlah Jam", "OT Jam", "OT Status", "Lokasi"]
    const rows = records.map((r) => [
      new Date(r.clock_in).toLocaleDateString("ms-MY"),
      r.employee?.name || "",
      r.employee?.position || "",
      new Date(r.clock_in).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }),
      r.clock_out ? new Date(r.clock_out).toLocaleTimeString("ms-MY", { hour: "2-digit", minute: "2-digit" }) : "-",
      r.total_hours?.toFixed(1) || "0",
      r.overtime_hours?.toFixed(1) || "0",
      r.ot_clock_in ? (r.ot_approved ? "Diluluskan" : "Pending") : "-",
      r.geo_lat && r.geo_lon ? `${r.geo_lat.toFixed(4)},${r.geo_lon.toFixed(4)}` : "-",
    ])

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `attendance_${dateFilter}.csv`
    a.click()
  }

  function openClockIn() {
    setClockType("clock_in")
    setSelectedEmployeeId("")
    setCurrentAttendanceId(undefined)
    setShowClockDialog(true)
  }

  function openClockOut(employeeId: string, attendanceId: string) {
    setClockType("clock_out")
    setSelectedEmployeeId(employeeId)
    setCurrentAttendanceId(attendanceId)
    setShowClockDialog(true)
  }

  const clockedInEmployeeIds = records.filter((r) => !r.clock_out).map((r) => r.employee_id)

  const filteredRecords = tab === "pending-ot" ? records.filter((r) => r.ot_clock_in && !r.ot_approved) : records

  const totalHours = records.reduce((sum, r) => sum + (r.total_hours || 0), 0)
  const totalOT = records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0)
  const pendingOT = records.filter((r) => r.ot_clock_in && !r.ot_approved).length

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold">Rekod Kehadiran</h1>
            <p className="text-muted-foreground">Kehadiran dan kelulusan OT</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openClockIn} className="bg-green-600 hover:bg-green-700">
              <CameraIcon className="h-4 w-4 mr-2" />
              Clock In
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-auto" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Jumlah Hadir</p>
              <p className="text-2xl font-bold">{records.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Jumlah Jam</p>
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">OT Jam</p>
              <p className="text-2xl font-bold text-orange-600">{totalOT.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">OT Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingOT}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Semua Rekod</TabsTrigger>
            <TabsTrigger value="pending-ot">OT Pending ({pendingOT})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3">
          {filteredRecords.map((record) => (
            <Card key={record.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {record.photo_url ? (
                      <button
                        onClick={() => {
                          setSelectedPhoto(record.photo_url || null)
                          setShowPhotoDialog(true)
                        }}
                        className="w-12 h-12 rounded-lg overflow-hidden bg-muted hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={record.photo_url || "/placeholder.svg"}
                          alt="Attendance"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{record.employee?.name}</p>
                      <p className="text-sm text-muted-foreground">{record.employee?.position}</p>
                      <div className="flex items-center gap-4 mt-1 text-sm">
                        <span>
                          Masuk:{" "}
                          {new Date(record.clock_in).toLocaleTimeString("ms-MY", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {record.clock_out && (
                          <span>
                            Keluar:{" "}
                            {new Date(record.clock_out).toLocaleTimeString("ms-MY", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {record.clock_out && (
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Jumlah Jam:</span>
                            <span className="font-medium">{record.total_hours?.toFixed(1) || "0"}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Break:</span>
                            <span>-{record.break_duration || 1}h</span>
                          </div>
                          <div className="flex justify-between border-t pt-1">
                            <span className="text-muted-foreground">Working Hours:</span>
                            <span className="font-medium">{record.working_hours?.toFixed(1) || "0"}h</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Normal Hours:</span>
                            <span>{record.normal_hours || 8}h</span>
                          </div>
                          {record.overtime_hours > 0 && (
                            <div className="flex justify-between border-t pt-1">
                              <span className="font-medium text-orange-600">OT Hours:</span>
                              <span className="font-bold text-orange-600">+{record.overtime_hours.toFixed(1)}h</span>
                            </div>
                          )}
                        </div>
                      )}
                      {record.geo_lat && record.geo_lon && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <a
                            href={`https://maps.google.com/?q=${record.geo_lat},${record.geo_lon}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            Lihat Lokasi
                          </a>
                        </div>
                      )}
                      {record.ot_clock_in && (
                        <div className="flex items-center gap-4 mt-1 text-sm text-orange-600">
                          <span>
                            OT Masuk:{" "}
                            {new Date(record.ot_clock_in).toLocaleTimeString("ms-MY", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {record.ot_clock_out && (
                            <span>
                              OT Keluar:{" "}
                              {new Date(record.ot_clock_out).toLocaleTimeString("ms-MY", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{record.working_hours?.toFixed(1) || "0"} jam</p>
                    {record.overtime_hours > 0 && (
                      <p className="text-sm text-orange-600 font-semibold">+{record.overtime_hours.toFixed(1)} OT</p>
                    )}
                    {record.ot_clock_in && (
                      <Badge
                        variant={record.ot_approved ? "default" : "outline"}
                        className={!record.ot_approved ? "bg-yellow-500/10 text-yellow-600" : ""}
                      >
                        OT: {record.ot_approved ? "Diluluskan" : "Pending"}
                      </Badge>
                    )}
                    {!record.clock_out && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
                        onClick={() => openClockOut(record.employee_id, record.id)}
                      >
                        <CameraIcon className="h-4 w-4 mr-1" />
                        Clock Out
                      </Button>
                    )}
                    {isAdmin && record.ot_clock_in && !record.ot_approved && (
                      <div className="flex gap-2 mt-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleRejectOT(record.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleApproveOT(record.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredRecords.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">Tiada rekod kehadiran untuk tarikh ini</div>
          )}
        </div>
      </div>

      <Dialog open={showClockDialog} onOpenChange={setShowClockDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{clockType === "clock_in" ? "Clock In" : "Clock Out"}</DialogTitle>
          </DialogHeader>

          {clockType === "clock_in" && (
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Pilih Pekerja</label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pekerja..." />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => !clockedInEmployeeIds.includes(e.id))
                    .map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} - {emp.position}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(selectedEmployeeId || clockType === "clock_out") && (
            <CameraAttendance
              employeeId={selectedEmployeeId}
              attendanceId={currentAttendanceId}
              type={clockType}
              photoRequired={true}
              onSuccess={() => {
                setShowClockDialog(false)
                loadData()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPhotoDialog} onOpenChange={setShowPhotoDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gambar Kehadiran</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <img src={selectedPhoto || "/placeholder.svg"} alt="Attendance photo" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
