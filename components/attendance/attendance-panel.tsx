"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Clock, MapPin, LogIn, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Employee, Attendance } from "@/lib/types"

interface AttendancePanelProps {
  employees: Employee[]
}

export function AttendancePanel({ employees }: AttendancePanelProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [currentTime, setCurrentTime] = useState(new Date())
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationError, setLocationError] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null)

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Get location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setLocationError("")
        },
        (error) => {
          setLocationError("Unable to get location. Please enable GPS.")
          console.error("Geolocation error:", error)
        },
      )
    } else {
      setLocationError("Geolocation not supported")
    }
  }, [])

  // Check if employee has active attendance
  useEffect(() => {
    if (selectedEmployee) {
      checkActiveAttendance()
    }
  }, [selectedEmployee])

  const checkActiveAttendance = async () => {
    if (!selectedEmployee) return

    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", selectedEmployee)
      .gte("clock_in", today.toISOString())
      .is("clock_out", null)
      .single()

    setActiveAttendance(data)
  }

  const handleClockIn = async () => {
    if (!selectedEmployee) {
      alert("Please select an employee")
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      // Check if already clocked in today
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: existing } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", selectedEmployee)
        .gte("clock_in", today.toISOString())
        .is("clock_out", null)
        .single()

      if (existing) {
        alert("Employee already clocked in today")
        return
      }

      // Determine if late (after 9 AM)
      const now = new Date()
      const isLate = now.getHours() >= 9 && now.getMinutes() > 0

      const { error } = await supabase.from("attendance").insert({
        employee_id: selectedEmployee,
        clock_in: now.toISOString(),
        clock_in_lat: location?.lat,
        clock_in_lng: location?.lng,
        is_late: isLate,
      })

      if (error) throw error

      alert("Clock in successful!")
      window.location.reload()
    } catch (error) {
      console.error("Clock in error:", error)
      alert("Failed to clock in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClockOut = async () => {
    if (!activeAttendance) {
      alert("No active attendance record found")
      return
    }

    setIsLoading(true)
    const supabase = createClient()

    try {
      const now = new Date()
      const clockIn = new Date(activeAttendance.clock_in)
      const totalHours = (now.getTime() - clockIn.getTime()) / (1000 * 60 * 60)
      const overtimeHours = Math.max(0, totalHours - 8)

      const { error } = await supabase
        .from("attendance")
        .update({
          clock_out: now.toISOString(),
          clock_out_lat: location?.lat,
          clock_out_lng: location?.lng,
          total_hours: Number(totalHours.toFixed(2)),
          overtime_hours: Number(overtimeHours.toFixed(2)),
        })
        .eq("id", activeAttendance.id)

      if (error) throw error

      alert("Clock out successful!")
      window.location.reload()
    } catch (error) {
      console.error("Clock out error:", error)
      alert("Failed to clock out")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Clock In / Out
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time */}
        <div className="text-center py-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Current Time</p>
          <p className="text-4xl font-bold">
            {currentTime.toLocaleTimeString("ms-MY", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </p>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString("ms-MY", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Location Status */}
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="h-4 w-4" />
          {location ? (
            <span className="text-green-600">
              Location: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </span>
          ) : (
            <span className="text-destructive">{locationError || "Getting location..."}</span>
          )}
        </div>

        {/* Employee Selection */}
        <div className="space-y-2">
          <Label>Select Employee</Label>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger>
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.name} - {emp.position}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Active Status */}
        {activeAttendance && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm">
            <p className="font-medium text-green-800">Currently Clocked In</p>
            <p className="text-green-700">
              Since{" "}
              {new Date(activeAttendance.clock_in).toLocaleTimeString("ms-MY", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            size="lg"
            onClick={handleClockIn}
            disabled={isLoading || !selectedEmployee || !!activeAttendance}
            className="h-16"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Clock In
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleClockOut}
            disabled={isLoading || !activeAttendance}
            className="h-16 bg-transparent"
          >
            <LogOut className="mr-2 h-5 w-5" />
            Clock Out
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
