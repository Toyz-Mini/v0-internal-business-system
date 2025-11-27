"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"
import type { Attendance, Employee } from "@/lib/types"

interface ClockedInStaffProps {
  attendance: (Attendance & { employee: Employee | null })[]
}

export function ClockedInStaff({ attendance }: ClockedInStaffProps) {
  const safeAttendance = attendance || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Staff On Duty
          <span className="ml-auto text-sm font-normal text-muted-foreground">{safeAttendance.length} active</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {safeAttendance.length === 0 ? (
          <p className="text-sm text-muted-foreground">No staff clocked in</p>
        ) : (
          <ul className="space-y-2">
            {safeAttendance.map((record) => (
              <li key={record.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <div>
                  <p className="font-medium">{record.employee?.name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{record.employee?.position || "-"}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  Since{" "}
                  {record.clock_in
                    ? new Date(record.clock_in).toLocaleTimeString("ms-MY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
