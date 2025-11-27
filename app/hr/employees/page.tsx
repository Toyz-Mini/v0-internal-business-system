"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { AppShell } from "@/components/layout/app-shell"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, User, Phone, Mail, Building } from "lucide-react"
import Link from "next/link"
import type { Employee } from "@/lib/types"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    const supabase = createClient()
    const { data } = await supabase.from("employees").select("*").order("name")
    setEmployees(data || [])
    setLoading(false)
  }

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) || e.position.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <AppShell>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Senarai Pekerja</h1>
            <p className="text-muted-foreground">{employees.length} pekerja berdaftar</p>
          </div>
          <Link href="/hr/employees/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Pekerja
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama atau jawatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Employee Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((employee) => (
            <Link key={employee.id} href={`/hr/employees/${employee.id}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      {employee.employee_photo ? (
                        <img
                          src={employee.employee_photo || "/placeholder.svg"}
                          alt={employee.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{employee.name}</h3>
                        <Badge variant={employee.is_active ? "default" : "secondary"} className="shrink-0">
                          {employee.is_active ? "Aktif" : "Tidak Aktif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Building className="h-3 w-3" />
                        {employee.position}
                      </p>
                      {employee.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {employee.phone}
                        </p>
                      )}
                      {employee.email && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3" />
                          {employee.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {employee.salary_type === "monthly" ? "Bulanan" : "Jam"}
                    </span>
                    <span className="font-medium">
                      BND {employee.salary_rate.toFixed(2)}
                      {employee.salary_type === "hourly" ? "/jam" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {filteredEmployees.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            {search ? "Tiada pekerja dijumpai" : "Tiada pekerja berdaftar"}
          </div>
        )}
      </div>
    </AppShell>
  )
}
