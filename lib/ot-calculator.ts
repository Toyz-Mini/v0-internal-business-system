/**
 * Duration-based OT Calculator for F&B Industry
 *
 * Logic:
 * - Working Hours = (Clock Out - Clock In) - Break Duration
 * - Normal Hours = 8 hours/day (configurable)
 * - OT Hours = max(0, Working Hours - Normal Hours)
 */

export interface OTCalculationInput {
  clockIn: Date | string
  clockOut: Date | string
  breakDurationHours?: number
  normalHoursPerDay?: number
}

export interface OTCalculationResult {
  totalHours: number // Total time between clock in and out
  breakHours: number // Break deduction
  workingHours: number // Net working hours after break
  normalHours: number // Standard work hours
  otHours: number // Overtime hours
  isOvertime: boolean
}

export function calculateOT(input: OTCalculationInput): OTCalculationResult {
  const clockIn = typeof input.clockIn === "string" ? new Date(input.clockIn) : input.clockIn
  const clockOut = typeof input.clockOut === "string" ? new Date(input.clockOut) : input.clockOut
  const breakHours = input.breakDurationHours ?? 1
  const normalHours = input.normalHoursPerDay ?? 8

  // Calculate total hours between clock in and out
  const totalMilliseconds = clockOut.getTime() - clockIn.getTime()
  const totalHours = totalMilliseconds / (1000 * 60 * 60)

  // Calculate working hours (minus break)
  const workingHours = Math.max(0, totalHours - breakHours)

  // Calculate OT hours (only if working hours exceed normal hours)
  const otHours = Math.max(0, workingHours - normalHours)

  return {
    totalHours: Number(totalHours.toFixed(2)),
    breakHours,
    workingHours: Number(workingHours.toFixed(2)),
    normalHours,
    otHours: Number(otHours.toFixed(2)),
    isOvertime: otHours > 0,
  }
}

/**
 * Calculate OT pay based on hourly rate and OT multiplier
 */
export function calculateOTPay(otHours: number, hourlyRate: number, otMultiplier = 1.5): number {
  return Number((otHours * hourlyRate * otMultiplier).toFixed(2))
}

/**
 * Test examples for validation:
 *
 * Example 1: 9 AM – 6 PM = 9 hours total, 1 hour break = 8 hours working, 0 OT
 * Example 2: 9 AM – 7 PM = 10 hours total, 1 hour break = 9 hours working, 1 OT
 * Example 3: 2 PM – 11 PM = 9 hours total, 1 hour break = 8 hours working, 0 OT
 * Example 4: 2 PM – 12 AM = 10 hours total, 1 hour break = 9 hours working, 1 OT
 */
export function testOTCalculator() {
  const testCases = [
    {
      name: "9 AM – 6 PM",
      clockIn: new Date("2024-01-01T09:00:00"),
      clockOut: new Date("2024-01-01T18:00:00"),
      expectedOT: 0,
    },
    {
      name: "9 AM – 7 PM",
      clockIn: new Date("2024-01-01T09:00:00"),
      clockOut: new Date("2024-01-01T19:00:00"),
      expectedOT: 1,
    },
    {
      name: "2 PM – 11 PM",
      clockIn: new Date("2024-01-01T14:00:00"),
      clockOut: new Date("2024-01-01T23:00:00"),
      expectedOT: 0,
    },
    {
      name: "2 PM – 12 AM",
      clockIn: new Date("2024-01-01T14:00:00"),
      clockOut: new Date("2024-01-02T00:00:00"),
      expectedOT: 1,
    },
  ]

  console.log("OT Calculator Test Results:")
  console.log("===========================")

  testCases.forEach((test) => {
    const result = calculateOT({
      clockIn: test.clockIn,
      clockOut: test.clockOut,
    })

    const passed = result.otHours === test.expectedOT
    console.log(`\n${test.name}:`)
    console.log(`  Total Hours: ${result.totalHours}`)
    console.log(`  Break: ${result.breakHours}h`)
    console.log(`  Working Hours: ${result.workingHours}`)
    console.log(`  OT Hours: ${result.otHours}`)
    console.log(`  Expected OT: ${test.expectedOT}`)
    console.log(`  Status: ${passed ? "✓ PASS" : "✗ FAIL"}`)
  })
}
