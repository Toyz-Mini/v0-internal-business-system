import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/layout/app-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BusinessSettings } from "@/components/settings/business-settings"
import { PrintSettings } from "@/components/settings/print-settings"
import { WebhookSettings } from "@/components/settings/webhook-settings"
import { InvitationManager } from "@/components/settings/invitation-manager"
import { RolePermissionsMatrix } from "@/components/settings/role-permissions-matrix"
import { AttendanceSettings } from "@/components/settings/attendance-settings"
import { LogoUpload } from "@/components/settings/logo-upload"
import { PrinterConfig } from "@/components/settings/printer-config"
import type { UserRole } from "@/lib/types"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*").eq("email", user.email).single()

  const userRole = (userProfile?.role || "staff") as UserRole
  const userName = userProfile?.name || user.email || "User"

  if (userRole !== "admin") {
    redirect("/dashboard")
  }

  const { data: settings } = await supabase.from("settings").select("*").single()

  return (
    <AppShell title="Settings" userRole={userRole} userName={userName}>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Configure your business preferences</p>
        </div>

        <Tabs defaultValue="business" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="business">Business</TabsTrigger>
            <TabsTrigger value="print">Print / Receipt</TabsTrigger>
            <TabsTrigger value="attendance">Kehadiran</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="invitations">Jemputan</TabsTrigger>
            <TabsTrigger value="roles">Peranan & Kebenaran</TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            <BusinessSettings settings={settings} />
          </TabsContent>

          <TabsContent value="print">
            <div className="space-y-4">
              <LogoUpload
                currentLogoUrl={settings?.receipt_logo_url}
                currentFooterUrl={settings?.receipt_footer_image_url}
              />
              <PrinterConfig settings={settings} />
              <PrintSettings settings={settings} />
            </div>
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceSettings settings={settings} />
          </TabsContent>

          <TabsContent value="webhooks">
            <WebhookSettings settings={settings} />
          </TabsContent>

          <TabsContent value="invitations">
            <InvitationManager />
          </TabsContent>

          <TabsContent value="roles">
            <RolePermissionsMatrix />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
