// Input validation utilities to prevent XSS and invalid inputs

// Sanitize string input - removes potential XSS vectors
export function sanitizeString(input: string): string {
  if (!input) return ""

  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim()
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate Malaysian phone number
export function isValidMalaysianPhone(phone: string): boolean {
  // Accepts formats: 0123456789, +60123456789, 60123456789
  const phoneRegex = /^(\+?60|0)[1-9]\d{7,9}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ""))
}

// Validate Malaysian IC number
export function isValidMalaysianIC(ic: string): boolean {
  // Format: YYMMDD-SS-NNNN or YYMMDDSSNNNN
  const icRegex = /^(\d{6})-?(\d{2})-?(\d{4})$/
  return icRegex.test(ic)
}

// Validate positive number
export function isPositiveNumber(value: unknown): boolean {
  const num = Number(value)
  return !isNaN(num) && num > 0
}

// Validate non-negative number
export function isNonNegativeNumber(value: unknown): boolean {
  const num = Number(value)
  return !isNaN(num) && num >= 0
}

// Validate price (max 2 decimal places, positive)
export function isValidPrice(value: unknown): boolean {
  const num = Number(value)
  if (isNaN(num) || num < 0) return false

  // Check for max 2 decimal places
  const str = String(num)
  const decimalIndex = str.indexOf(".")
  if (decimalIndex !== -1 && str.length - decimalIndex - 1 > 2) {
    return false
  }

  return true
}

// Validate quantity (positive integer)
export function isValidQuantity(value: unknown): boolean {
  const num = Number(value)
  return !isNaN(num) && num > 0 && Number.isInteger(num)
}

// Validate stock quantity (can be decimal, non-negative)
export function isValidStockQuantity(value: unknown): boolean {
  const num = Number(value)
  return !isNaN(num) && num >= 0
}

// Validate date string
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

// Validate date is not in future
export function isNotFutureDate(dateString: string): boolean {
  const date = new Date(dateString)
  return date <= new Date()
}

// Validate string length
export function isValidLength(str: string, min: number, max: number): boolean {
  const len = str.trim().length
  return len >= min && len <= max
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Form validation helper
export interface ValidationError {
  field: string
  message: string
}

export function validateForm(
  rules: { field: string; value: unknown; validators: Array<(v: unknown) => string | null> }[],
): ValidationError[] {
  const errors: ValidationError[] = []

  for (const rule of rules) {
    for (const validator of rule.validators) {
      const error = validator(rule.value)
      if (error) {
        errors.push({ field: rule.field, message: error })
        break // Only first error per field
      }
    }
  }

  return errors
}

// Common validators
export const required =
  (message = "Field ini diperlukan") =>
  (value: unknown) => {
    if (value === null || value === undefined || value === "") return message
    return null
  }

export const minLength = (min: number, message?: string) => (value: unknown) => {
  if (typeof value !== "string" || value.length < min) {
    return message || `Minimum ${min} aksara diperlukan`
  }
  return null
}

export const maxLength = (max: number, message?: string) => (value: unknown) => {
  if (typeof value !== "string" || value.length > max) {
    return message || `Maksimum ${max} aksara sahaja`
  }
  return null
}

export const positiveNumber =
  (message = "Sila masukkan nombor positif") =>
  (value: unknown) => {
    if (!isPositiveNumber(value)) return message
    return null
  }

export const validEmail =
  (message = "Format email tidak sah") =>
  (value: unknown) => {
    if (typeof value !== "string" || !isValidEmail(value)) return message
    return null
  }

export const validPhone =
  (message = "Format nombor telefon tidak sah") =>
  (value: unknown) => {
    if (typeof value !== "string" || !isValidMalaysianPhone(value)) return message
    return null
  }
