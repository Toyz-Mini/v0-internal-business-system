"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock } from "lucide-react"
import type { Attendance, Employee } from "@/lib/types"

interface AttendanceHistoryProps {
  attendance: (Attendance & { employee: Employee })[]
}

export function AttendanceHistory({ attendance }: AttendanceHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Today&apos;s Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attendance.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No attendance records today</p>
        ) : (
          <ul className="space-y-3">
            {attendance.map((record) => (
              <li key={record.id} className="rounded-lg border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium">{record.employee?.name}</p>
                  <p className="text-sm text-muted-foreground">{record.employee?.position}</p>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span>
                      In:{" "}
                      {new Date(record.clock_in).toLocaleTimeString("ms-MY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {record.clock_out && (
                      <span>
                        Out:{" "}
                        {new Date(record.clock_out).toLocaleTimeString("ms-MY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                    {record.total_hours && (
                      <span className="text-muted-foreground">({record.total_hours.toFixed(1)}h)</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!record.clock_out && <Badge variant="default">Active</Badge>}
                  {record.is_late && <Badge variant="destructive">Late</Badge>}
                  {record.overtime_hours && record.overtime_hours > 0 && (
                    <Badge variant="secondary">OT: {record.overtime_hours.toFixed(1)}h</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
