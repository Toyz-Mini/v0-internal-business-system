# Duration-Based OT System Implementation - Complete

## Overview
Implemented comprehensive F&B industry-standard overtime system based on actual working duration, not fixed clock-out times.

---

## OT Calculation Formula

\`\`\`
Total Hours = Clock Out - Clock In (decimal hours)
Working Hours = Total Hours - Break Duration
OT Hours = max(0, Working Hours - Standard Work Hours)
OT Pay = OT Hours × Hourly Rate × OT Multiplier
\`\`\`

### Example Calculations

**Scenario 1: Standard 8-hour shift with 1-hour break**
- Clock In: 09:00, Clock Out: 18:00
- Total: 9 hours
- Break: 1 hour
- Working: 9 - 1 = 8 hours
- OT: max(0, 8 - 8) = 0 hours

**Scenario 2: Extended shift with overtime**
- Clock In: 09:00, Clock Out: 21:00
- Total: 12 hours
- Break: 1 hour
- Working: 12 - 1 = 11 hours
- OT: max(0, 11 - 8) = 3 hours
- OT Pay (if hourly rate is BND 10): 3 × 10 × 1.5 = BND 45

**Scenario 3: Short shift (part-time)**
- Clock In: 14:00, Clock Out: 18:00
- Total: 4 hours
- Break: 0.5 hours
- Working: 4 - 0.5 = 3.5 hours
- OT: max(0, 3.5 - 8) = 0 hours (no OT for under-hours)

---

## Database Changes

### Settings Table - New Columns
\`\`\`sql
standard_work_hours_per_day: NUMERIC (default: 8)
break_duration_hours: NUMERIC (default: 1)
ot_rate_multiplier: NUMERIC (default: 1.5)
ot_requires_approval: BOOLEAN (default: false)
\`\`\`

### Attendance Table - Existing Columns Used
\`\`\`sql
total_hours: NUMERIC -- Clock out - Clock in
break_duration: NUMERIC -- Configurable break time
working_hours: NUMERIC -- total_hours - break_duration
normal_hours: NUMERIC -- Standard work hours (8)
overtime_hours: NUMERIC -- max(0, working_hours - normal_hours)
\`\`\`

---

## Components Implemented

### 1. OT Calculator Utility (`lib/ot-calculator.ts`)
**Purpose:** Centralized OT calculation logic with validation

**Functions:**
- `calculateOvertimeHours()` - Core OT calculation
- `calculateOvertimePay()` - OT pay calculation
- `formatDuration()` - Human-readable duration formatting

**Features:**
- Handles edge cases (negative values, missing data)
- Supports configurable break duration
- Automatic rounding to 2 decimal places
- Comprehensive JSDoc documentation

### 2. Enhanced Attendance Settings (`components/settings/attendance-settings.tsx`)
**New Configuration Options:**
- Standard Work Hours (4-12 hours range, default: 8)
- Break Duration (0-4 hours range, default: 1)
- OT Rate Multiplier (1.0x-3.0x range, default: 1.5x)
- Require OT Approval toggle

**UI Features:**
- Real-time validation
- Clear labels with descriptions
- Save button with loading state
- Toast notifications for success/error

### 3. Camera Attendance Clock Out (`components/hr/camera-attendance.tsx`)
**Auto-Calculation on Clock Out:**
- Fetches attendance record
- Calculates total hours from clock times
- Applies break duration from settings
- Computes working hours and OT hours
- Updates attendance record with all values
- Shows detailed breakdown in UI

**Display Format:**
\`\`\`
Total: 12.00h | Break: 1.00h | Working: 11.00h | OT: 3.00h
\`\`\`

### 4. Attendance Page (`app/hr/attendance/page.tsx`)
**Enhanced Display:**
- Detailed hour breakdown in table columns
- Color-coded OT hours (red if > 0)
- Sortable by all time columns
- Filter by date range
- Export functionality includes all OT data

### 5. Payroll Integration (`components/employees/attendance-report-dialog.tsx`)
**Auto-Calculation:**
- Sums total OT hours for period
- Calculates hourly rate from monthly salary
- Computes OT pay: `OT Hours × Hourly Rate × Multiplier`
- Displays in payroll summary
- Includes in total compensation

**Payroll Display:**
\`\`\`
Base Salary: BND 2,000.00
OT Pay (45.0h × 1.5x): BND 562.50
Total: BND 2,562.50
\`\`\`

---

## Settings Page Integration

**Location:** Settings → Attendance tab

**Configuration Options:**
1. Photo/Geolocation Requirements
2. Working Hours & OT Settings:
   - Standard Work Hours per Day
   - Break Duration
   - OT Rate Multiplier
   - Require OT Approval
3. Late Arrival Threshold
4. Auto-approve OT toggle

---

## User Flows

### Admin: Configure OT Settings
1. Navigate to Settings → Attendance
2. Set standard work hours (e.g., 8 hours)
3. Set break duration (e.g., 1 hour)
4. Set OT multiplier (e.g., 1.5x for time-and-a-half)
5. Enable/disable OT approval requirement
6. Click Save

### Employee: Clock In/Out with Automatic OT
1. Navigate to HR → Attendance
2. Click "Clock In" (camera opens for photo + GPS)
3. Work their shift
4. Click "Clock Out" (camera opens for photo + GPS)
5. System automatically calculates:
   - Total hours worked
   - Break deduction
   - Net working hours
   - OT hours (if applicable)
6. Employee sees breakdown immediately

### Manager: Review OT Records
1. Navigate to HR → Attendance
2. View attendance table with columns:
   - Total Hours, Break, Working Hours, OT Hours
3. Sort by OT hours to find highest earners
4. Export to CSV for payroll processing
5. Review individual employee reports

### Payroll: Generate Monthly Reports
1. Navigate to HR → Employees
2. Click employee → View Attendance Report
3. Select date range (e.g., full month)
4. System shows:
   - Total OT hours for period
   - OT pay calculation
   - Total compensation
5. Export or print for payroll processing

---

## Validation & Testing

### Database Validation
- All OT settings columns exist with correct defaults
- Attendance table has all required columns
- Default values applied to existing records

### UI Validation
- Settings page renders OT configuration
- Attendance page shows detailed breakdown
- Clock out auto-calculates OT correctly
- Payroll report includes OT pay

### Test Scenarios Covered
1. Standard shift (no OT)
2. Extended shift (with OT)
3. Short shift / part-time (no OT)
4. Multiple break durations
5. Different OT multipliers
6. Edge cases (negative hours, missing data)

---

## Migration Guide for Existing Data

**Automatic Migration:**
- All existing attendance records get default values:
  - `break_duration`: 1 hour
  - `normal_hours`: 8 hours
- Settings table populated with industry defaults
- No manual intervention required

**Manual Review Recommended:**
- Review historical attendance records
- Adjust break durations for specific dates if needed
- Recalculate OT for past payroll periods if necessary

---

## Benefits Over Previous System

### Old System (Fixed Clock-Out Based)
- OT triggered by clock-out time (e.g., after 6 PM)
- No consideration for actual hours worked
- No break deduction
- Fixed OT threshold regardless of shift start

### New System (Duration-Based)
- OT based on actual working duration
- Accounts for break time
- Flexible for different shift patterns
- Configurable standards per business needs
- Accurate payroll calculation
- Industry-standard F&B practice

---

## Technical Architecture

### Data Flow
\`\`\`
Clock In → Store clock_in timestamp
   ↓
Work Shift (includes break)
   ↓
Clock Out → Calculate:
   • total_hours = clock_out - clock_in
   • working_hours = total_hours - break_duration
   • overtime_hours = max(0, working_hours - normal_hours)
   ↓
Update Attendance Record
   ↓
Payroll Calculation:
   • ot_pay = overtime_hours × hourly_rate × ot_multiplier
\`\`\`

### Component Hierarchy
\`\`\`
app/hr/attendance/page.tsx
├── CameraAttendance (clock in/out)
│   └── OT Calculator (auto-calculate on clock out)
├── Attendance Table (display breakdown)
└── Export (CSV with OT data)

app/settings/page.tsx
└── AttendanceSettings
    └── OT Configuration Form

components/employees/attendance-report-dialog.tsx
└── Payroll Summary with OT Pay
\`\`\`

---

## Future Enhancements (Not Implemented)

1. **OT Approval Workflow**
   - If `ot_requires_approval` is true, OT needs manager approval
   - Notification system for pending approvals
   - Approval/rejection interface

2. **OT Caps & Limits**
   - Maximum OT hours per day
   - Maximum OT hours per week
   - Warnings when approaching limits

3. **Different OT Rates**
   - Weekday OT: 1.5x
   - Weekend OT: 2.0x
   - Public holiday OT: 3.0x

4. **Break Time Tracking**
   - Clock in/out for break periods
   - Automatic break time calculation
   - Multiple break periods per shift

5. **Shift Differentials**
   - Night shift premium
   - Weekend shift premium
   - Holiday shift premium

---

## Production Deployment Checklist

- [x] Database migrations applied
- [x] Settings table updated with OT fields
- [x] Attendance table columns verified
- [x] OT calculator utility created
- [x] Settings UI for OT configuration
- [x] Clock out auto-calculation implemented
- [x] Attendance page UI updated
- [x] Payroll integration completed
- [x] Test scenarios validated
- [x] Documentation completed

**System Status:** PRODUCTION READY

**Next Steps:**
1. Click "Publish" to deploy to abangbobeat.store
2. Train staff on new OT system
3. Configure OT settings in Settings → Attendance
4. Monitor first payroll cycle with new calculations
5. Gather feedback and iterate if needed

---

## Support & Troubleshooting

### Common Issues

**Q: OT hours showing 0 even though employee worked overtime?**
A: Check Settings → Attendance:
- Verify standard_work_hours_per_day is set correctly (default: 8)
- Verify break_duration_hours is set correctly (default: 1)
- Ensure working_hours > standard_work_hours

**Q: OT pay calculation seems incorrect?**
A: Verify in Settings:
- OT rate multiplier is correct (default: 1.5x)
- Employee's salary is entered correctly
- Formula: OT Hours × (Monthly Salary ÷ 22 ÷ 8) × Multiplier

**Q: Can't see detailed hour breakdown?**
A: The attendance table shows:
- Total: Total clock time
- Break: Break duration
- Working: Total - Break
- OT: max(0, Working - Standard)

**Q: Want to change break duration for specific employee?**
A: Currently, break duration is global. Future enhancement will support per-employee break settings.

---

**Implementation Complete - Ready for Production Deployment**
</parameter>
