"use client"

import type React from "react"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pencil, Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Employee } from "@/lib/types"

interface EmployeesTableProps {
  employees: Employee[]
}

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const [search, setSearch] = useState("")
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) || e.position.toLowerCase().includes(search.toLowerCase()),
  )

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingEmployee) return

    setIsUpdating(true)
    const supabase = createClient()
    const formData = new FormData(e.currentTarget)

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          name: formData.get("name") as string,
          ic_number: formData.get("ic_number") as string,
          phone: formData.get("phone") as string,
          email: formData.get("email") as string,
          position: formData.get("position") as string,
          salary_type: formData.get("salary_type") as string,
          salary_rate: Number(formData.get("salary_rate")),
          is_active: formData.get("is_active") === "true",
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingEmployee.id)

      if (error) throw error
      setEditingEmployee(null)
      window.location.reload()
    } catch (error) {
      console.error("Error updating employee:", error)
      alert("Failed to update employee")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Salary Type</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{emp.position}</TableCell>
                <TableCell>{emp.phone || "-"}</TableCell>
                <TableCell className="capitalize">{emp.salary_type}</TableCell>
                <TableCell>
                  BND {emp.salary_rate.toFixed(2)}
                  {emp.salary_type === "hourly" && "/hr"}
                </TableCell>
                <TableCell>{new Date(emp.join_date).toLocaleDateString("ms-MY")}</TableCell>
                <TableCell>
                  <Badge variant={emp.is_active ? "default" : "secondary"}>
                    {emp.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => setEditingEmployee(emp)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" defaultValue={editingEmployee?.name} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ic_number">IC Number</Label>
                <Input id="ic_number" name="ic_number" defaultValue={editingEmployee?.ic_number || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editingEmployee?.phone || ""} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input id="position" name="position" defaultValue={editingEmployee?.position} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_type">Salary Type</Label>
                <Select name="salary_type" defaultValue={editingEmployee?.salary_type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_rate">Rate (BND)</Label>
                <Input
                  id="salary_rate"
                  name="salary_rate"
                  type="number"
                  step="0.01"
                  defaultValue={editingEmployee?.salary_rate}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <Select name="is_active" defaultValue={String(editingEmployee?.is_active)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setEditingEmployee(null)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
