"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, Shield } from "lucide-react"
import type { Role, Permission } from "@/lib/types"

export function RolePermissionsMatrix() {
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<number, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      const [rolesRes, permsRes, rpRes] = await Promise.all([
        supabase.from("roles").select("*").order("id"),
        supabase.from("permissions").select("*").order("category, code"),
        supabase.from("role_permissions").select("*"),
      ])

      setRoles(rolesRes.data || [])
      setPermissions(permsRes.data || [])

      // Build role permissions map
      const rpMap: Record<number, string[]> = {}
      rolesRes.data?.forEach((r) => {
        rpMap[r.id] = []
      })
      rpRes.data?.forEach((rp) => {
        if (rpMap[rp.role_id]) {
          rpMap[rp.role_id].push(rp.permission_code)
        }
      })
      setRolePermissions(rpMap)
    } catch (error) {
      toast.error("Gagal memuatkan data")
    } finally {
      setIsLoading(false)
    }
  }

  async function togglePermission(roleId: number, permCode: string, hasPermission: boolean) {
    const key = `${roleId}-${permCode}`
    setIsSaving(key)

    try {
      if (hasPermission) {
        // Remove permission
        const { error } = await supabase
          .from("role_permissions")
          .delete()
          .eq("role_id", roleId)
          .eq("permission_code", permCode)

        if (error) throw error

        setRolePermissions((prev) => ({
          ...prev,
          [roleId]: prev[roleId].filter((p) => p !== permCode),
        }))
      } else {
        // Add permission
        const { error } = await supabase.from("role_permissions").insert({ role_id: roleId, permission_code: permCode })

        if (error) throw error

        setRolePermissions((prev) => ({
          ...prev,
          [roleId]: [...(prev[roleId] || []), permCode],
        }))
      }

      toast.success("Kebenaran dikemas kini")
    } catch (error) {
      toast.error("Gagal mengemas kini kebenaran")
    } finally {
      setIsSaving(null)
    }
  }

  // Group permissions by category
  const permsByCategory = permissions.reduce(
    (acc, p) => {
      const cat = p.category || "other"
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(p)
      return acc
    },
    {} as Record<string, Permission[]>,
  )

  const categoryLabels: Record<string, string> = {
    general: "Umum",
    sales: "Jualan",
    inventory: "Inventori",
    hr: "HR",
    reports: "Laporan",
    settings: "Tetapan",
    admin: "Pentadbir",
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Matriks Kebenaran Peranan
        </CardTitle>
        <CardDescription>Tetapkan kebenaran untuk setiap peranan dalam sistem</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Kebenaran</TableHead>
                {roles.map((role) => (
                  <TableHead key={role.id} className="text-center min-w-[100px]">
                    <Badge variant={role.name === "admin" ? "default" : "secondary"}>{role.name}</Badge>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(permsByCategory).map(([category, perms]) => (
                <>
                  <TableRow key={`cat-${category}`} className="bg-muted/50">
                    <TableCell colSpan={roles.length + 1} className="font-semibold">
                      {categoryLabels[category] || category}
                    </TableCell>
                  </TableRow>
                  {perms.map((perm) => (
                    <TableRow key={perm.code}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{perm.label}</p>
                          {perm.description && <p className="text-xs text-muted-foreground">{perm.description}</p>}
                        </div>
                      </TableCell>
                      {roles.map((role) => {
                        const hasPermission = rolePermissions[role.id]?.includes(perm.code)
                        const key = `${role.id}-${perm.code}`
                        return (
                          <TableCell key={key} className="text-center">
                            {isSaving === key ? (
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                              <Checkbox
                                checked={hasPermission}
                                onCheckedChange={() => togglePermission(role.id, perm.code, hasPermission)}
                                disabled={role.name === "admin"} // Admin always has all
                              />
                            )}
                          </TableCell>
                        )
                      })}
                    </TableRow>
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
