"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Copy, Link2, Loader2, Plus, Trash2, Check } from "lucide-react"
import type { Role, Invitation } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { ms } from "date-fns/locale"

export function InvitationManager() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Form state
  const [selectedRoleId, setSelectedRoleId] = useState<string>("")
  const [email, setEmail] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("7")

  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setIsLoading(true)
    try {
      // Fetch roles
      const { data: rolesData } = await supabase.from("roles").select("*").order("id")

      // Fetch invitations with role info
      const { data: invData } = await supabase
        .from("invitations")
        .select("*, roles:role_id(*), creator:created_by(name)")
        .order("created_at", { ascending: false })

      setRoles(rolesData || [])
      setInvitations(invData || [])
    } catch (error) {
      toast.error("Gagal memuatkan data")
    } finally {
      setIsLoading(false)
    }
  }

  function generateToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let token = ""
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  async function handleCreateInvitation() {
    if (!selectedRoleId) {
      toast.error("Sila pilih peranan")
      return
    }

    setIsCreating(true)
    try {
      const token = generateToken()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + Number.parseInt(expiresInDays))

      const { data: userData } = await supabase.auth.getUser()

      const { error } = await supabase.from("invitations").insert({
        token,
        role_id: Number.parseInt(selectedRoleId),
        email: email || null,
        expires_at: expiresAt.toISOString(),
        created_by: userData.user?.id,
      })

      if (error) throw error

      toast.success("Jemputan berjaya dicipta!")
      setShowDialog(false)
      setEmail("")
      setSelectedRoleId("")
      fetchData()
    } catch (error) {
      toast.error("Gagal mencipta jemputan")
    } finally {
      setIsCreating(false)
    }
  }

  async function handleDeleteInvitation(id: string) {
    try {
      const { error } = await supabase.from("invitations").delete().eq("id", id)

      if (error) throw error
      toast.success("Jemputan dipadam")
      fetchData()
    } catch (error) {
      toast.error("Gagal memadam jemputan")
    }
  }

  function getInviteUrl(token: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    return `${baseUrl}/auth/register?token=${token}`
  }

  async function copyToClipboard(token: string, id: string) {
    const url = getInviteUrl(token)
    await navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success("Pautan disalin!")
    setTimeout(() => setCopiedId(null), 2000)
  }

  function getStatusBadge(inv: Invitation) {
    if (inv.used) {
      return <Badge variant="secondary">Telah Digunakan</Badge>
    }
    if (new Date(inv.expires_at) < new Date()) {
      return <Badge variant="destructive">Tamat Tempoh</Badge>
    }
    return (
      <Badge variant="default" className="bg-green-600">
        Aktif
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Jemputan Pengguna</CardTitle>
          <CardDescription>Buat pautan jemputan untuk pengguna baharu</CardDescription>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Cipta Jemputan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cipta Jemputan Baharu</DialogTitle>
              <DialogDescription>Buat pautan jemputan untuk pengguna baharu mendaftar</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="role">Peranan</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih peranan" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.name} - {role.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email (Pilihan)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="staff@abangbob.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Jika ditetapkan, hanya email ini boleh menggunakan jemputan
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expires">Tamat Tempoh Dalam</Label>
                <Select value={expiresInDays} onValueChange={setExpiresInDays}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hari</SelectItem>
                    <SelectItem value="3">3 hari</SelectItem>
                    <SelectItem value="7">7 hari</SelectItem>
                    <SelectItem value="14">14 hari</SelectItem>
                    <SelectItem value="30">30 hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button onClick={handleCreateInvitation} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mencipta...
                  </>
                ) : (
                  "Cipta Jemputan"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Tiada jemputan aktif</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Peranan</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tamat Tempoh</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{(inv.role as any)?.name || "-"}</TableCell>
                  <TableCell>{inv.email || "-"}</TableCell>
                  <TableCell>{format(new Date(inv.expires_at), "dd MMM yyyy", { locale: ms })}</TableCell>
                  <TableCell>{getStatusBadge(inv)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!inv.used && new Date(inv.expires_at) >= new Date() && (
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(inv.token, inv.id)}>
                          {copiedId === inv.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteInvitation(inv.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
