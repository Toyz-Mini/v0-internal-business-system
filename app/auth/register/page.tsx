"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function RegisterForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [invitation, setInvitation] = useState<{
    id: string
    role_id: number
    role_name: string
    email?: string
  } | null>(null)
  const [success, setSuccess] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const supabase = createClient()

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Pautan jemputan tidak sah. Sila hubungi admin.")
        setIsValidating(false)
        return
      }

      try {
        // Validate invitation token
        const { data: inv, error: invError } = await supabase
          .from("invitations")
          .select("id, role_id, email, expires_at, used, roles:role_id(name)")
          .eq("token", token)
          .single()

        if (invError || !inv) {
          setError("Pautan jemputan tidak sah atau telah tamat tempoh.")
          setIsValidating(false)
          return
        }

        if (inv.used) {
          setError("Pautan jemputan ini telah digunakan.")
          setIsValidating(false)
          return
        }

        if (new Date(inv.expires_at) < new Date()) {
          setError("Pautan jemputan telah tamat tempoh.")
          setIsValidating(false)
          return
        }

        setInvitation({
          id: inv.id,
          role_id: inv.role_id,
          role_name: (inv.roles as any)?.name || "staff",
          email: inv.email || undefined,
        })
        if (inv.email) setEmail(inv.email)
      } catch (err) {
        setError("Ralat semasa mengesahkan jemputan.")
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, supabase])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invitation) return

    if (password !== confirmPassword) {
      setError("Kata laluan tidak sepadan.")
      return
    }

    if (password.length < 6) {
      setError("Kata laluan mestilah sekurang-kurangnya 6 aksara.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: { name },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Gagal mencipta akaun")

      // 2. Create user record in users table
      const { error: userError } = await supabase.from("users").insert({
        id: authData.user.id,
        email,
        name,
        role: invitation.role_name as "admin" | "cashier" | "staff",
        role_id: invitation.role_id,
        is_active: true,
      })

      if (userError) throw userError

      // 3. Mark invitation as used
      await supabase
        .from("invitations")
        .update({ used: true, used_at: new Date().toISOString() })
        .eq("id", invitation.id)

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/auth/login")
      }, 3000)
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Pendaftaran gagal")
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Mengesahkan jemputan...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Jemputan Tidak Sah</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="w-full mt-4 bg-transparent" variant="outline" onClick={() => router.push("/auth/login")}>
              Kembali ke Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
        <Card className="w-full max-w-sm">
          <CardContent className="py-8">
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Pendaftaran Berjaya!</AlertTitle>
              <AlertDescription className="text-green-600">
                Akaun anda telah dicipta. Mengalihkan ke halaman login...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Daftar Akaun</CardTitle>
            <CardDescription>
              Anda dijemput sebagai <strong className="text-primary">{invitation?.role_name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister}>
              <div className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nama Penuh</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Ahmad bin Ali"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="anda@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!!invitation?.email}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Kata Laluan</Label>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Sahkan Kata Laluan</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mendaftar...
                    </>
                  ) : (
                    "Daftar"
                  )}
                </Button>
              </div>
            </form>
            <p className="text-xs text-muted-foreground mt-4 text-center">Sistem AbangBob Ayam Gunting</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-muted p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  )
}
