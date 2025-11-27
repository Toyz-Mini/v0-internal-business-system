# Duration-Based OT System Testing Guide

## Test Cases

### 1. Database Schema Validation

**Expected Results:**
- `settings` table has new OT fields:
  - `standard_work_hours_per_day` (default: 8)
  - `break_duration_hours` (default: 1)
  - `ot_rate_multiplier` (default: 1.5)
  - `ot_requires_approval` (default: false)

- `attendance` table properly uses:
  - `total_hours` - Raw time between clock in/out
  - `break_duration` - Break deduction (default: 1h)
  - `working_hours` - Net working hours after break
  - `normal_hours` - Standard hours (default: 8h)
  - `overtime_hours` - OT calculation result

**SQL Validation:**
\`\`\`sql
-- Check settings columns
SELECT 
  standard_work_hours_per_day,
  break_duration_hours,
  ot_rate_multiplier,
  ot_requires_approval
FROM settings LIMIT 1;

-- Check attendance columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'attendance' 
  AND column_name IN ('total_hours', 'break_duration', 'working_hours', 'normal_hours', 'overtime_hours');
\`\`\`

### 2. OT Calculation Unit Tests

**Test Case 1: 9 AM – 6 PM**
- Clock In: 09:00
- Clock Out: 18:00
- Total Hours: 9
- Break: 1 hour
- Working Hours: 8 (9 - 1)
- Normal Hours: 8
- **Expected OT: 0 hours**

**Test Case 2: 9 AM – 7 PM**
- Clock In: 09:00
- Clock Out: 19:00
- Total Hours: 10
- Break: 1 hour
- Working Hours: 9 (10 - 1)
- Normal Hours: 8
- **Expected OT: 1 hour**

**Test Case 3: 2 PM – 11 PM**
- Clock In: 14:00
- Clock Out: 23:00
- Total Hours: 9
- Break: 1 hour
- Working Hours: 8 (9 - 1)
- Normal Hours: 8
- **Expected OT: 0 hours**

**Test Case 4: 2 PM – 12 AM**
- Clock In: 14:00
- Clock Out: 00:00 (next day)
- Total Hours: 10
- Break: 1 hour
- Working Hours: 9 (10 - 1)
- Normal Hours: 8
- **Expected OT: 1 hour**

**JavaScript Test:**
\`\`\`javascript
import { calculateOT, testOTCalculator } from '@/lib/ot-calculator'

// Run test suite
testOTCalculator()

// Or test individual case
const result = calculateOT({
  clockIn: new Date('2024-01-01T09:00:00'),
  clockOut: new Date('2024-01-01T19:00:00'),
  breakDurationHours: 1,
  normalHoursPerDay: 8
})

console.log(result)
// Expected: { totalHours: 10, breakHours: 1, workingHours: 9, normalHours: 8, otHours: 1, isOvertime: true }
\`\`\`

### 3. UI Component Testing

#### Settings Page
1. Navigate to Settings > Attendance tab
2. Verify new OT configuration section exists
3. Test fields:
   - Standard Working Hours Per Day (default: 8)
   - Break Duration (default: 1)
   - OT Rate Multiplier (1.0x, 1.5x, 2.0x, 2.5x, 3.0x)
   - OT Requires Manager Approval toggle
4. Save settings and verify persistence

#### Attendance Page
1. Clock In for a test employee
2. Clock Out after 9+ hours
3. Verify attendance record shows:
   - Total Hours (raw)
   - Break deduction
   - Working Hours (net)
   - Normal Hours (8h)
   - OT Hours (if any)
4. Check OT breakdown card displays correctly

#### Payroll Report
1. Navigate to Payroll Report
2. Generate report for date range with OT records
3. Verify columns:
   - Working Hours
   - OT Hours
   - Base Pay
   - OT Pay (calculated with multiplier)
   - Total Salary
4. Verify totals row sums correctly
5. Export CSV and check format

### 4. End-to-End Testing Scenarios

#### Scenario A: Normal 8-Hour Shift
1. Employee clocks in at 9:00 AM
2. Employee clocks out at 6:00 PM
3. System should record:
   - Total: 9 hours
   - Working: 8 hours (after 1h break)
   - OT: 0 hours
4. Payroll shows only base pay, no OT pay

#### Scenario B: 1 Hour Overtime
1. Employee clocks in at 9:00 AM
2. Employee clocks out at 7:00 PM
3. System should record:
   - Total: 10 hours
   - Working: 9 hours (after 1h break)
   - OT: 1 hour
4. Payroll shows base pay + OT pay (1h × rate × 1.5)

#### Scenario C: Evening Shift (No OT)
1. Employee clocks in at 2:00 PM
2. Employee clocks out at 11:00 PM
3. System should record:
   - Total: 9 hours
   - Working: 8 hours (after 1h break)
   - OT: 0 hours
4. No OT pay calculated

#### Scenario D: Evening Shift (With OT)
1. Employee clocks in at 2:00 PM
2. Employee clocks out at 12:00 AM
3. System should record:
   - Total: 10 hours
   - Working: 9 hours (after 1h break)
   - OT: 1 hour
4. OT pay calculated correctly

### 5. Validation Checklist

- [ ] Database schema updated with all OT fields
- [ ] OT calculator utility working correctly
- [ ] All 4 test cases pass
- [ ] Settings page displays OT configuration
- [ ] Settings save and persist correctly
- [ ] Attendance page shows OT breakdown
- [ ] Clock out calculates OT automatically
- [ ] Payroll report includes OT columns
- [ ] Payroll export CSV includes OT data
- [ ] OT multiplier applied correctly (1.5x default)
- [ ] Mobile camera attendance still works
- [ ] Admin can edit attendance records
- [ ] Historical data migrated/handled correctly

### 6. Production Deployment Steps

1. **Backup Database**
   \`\`\`sql
   -- Backup attendance table
   CREATE TABLE attendance_backup AS SELECT * FROM attendance;
   \`\`\`

2. **Run Migration**
   - Deploy code with migration
   - Verify migration success
   - Check all columns exist

3. **Update Existing Records**
   \`\`\`sql
   -- Recalculate OT for existing records
   UPDATE attendance 
   SET 
     break_duration = 1,
     normal_hours = 8,
     working_hours = GREATEST(0, EXTRACT(EPOCH FROM (clock_out - clock_in))/3600 - 1),
     overtime_hours = GREATEST(0, EXTRACT(EPOCH FROM (clock_out - clock_in))/3600 - 1 - 8)
   WHERE clock_out IS NOT NULL 
     AND (working_hours IS NULL OR overtime_hours IS NULL);
   \`\`\`

4. **Verify with Sample Data**
   - Test with 2-3 employees
   - Clock in/out and verify calculations
   - Generate payroll report

5. **Monitor Logs**
   - Check for console errors
   - Monitor database queries
   - Watch for calculation edge cases

### 7. Known Edge Cases

- **Midnight Crossing:** Ensure date handling for shifts that cross midnight
- **Multiple Shifts:** If employee clocks in multiple times per day
- **Missing Clock Out:** Handle incomplete attendance records
- **Different Break Durations:** Per-employee custom break times
- **Public Holidays:** Special OT rates for holidays (future enhancement)

## Screenshots Required

1. Settings page with new OT configuration
2. Attendance record with OT breakdown
3. Payroll report showing OT columns
4. CSV export with complete OT data
5. Test case validation results (console.log output)
