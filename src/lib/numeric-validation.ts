/**
 * Numeric validation utilities for budget and credit operations
 * Ensures all monetary amounts are valid numbers and not negative
 */

export interface ValidationError {
  field: string
  message: string
}

/**
 * Validates that a value is a valid positive number or zero
 * @param value - The value to validate
 * @param fieldName - Name of the field for error messages
 * @param allowZero - Whether to allow zero (default: true)
 * @returns { isValid: boolean, error?: ValidationError }
 */
export function validateNumericAmount(
  value: any,
  fieldName: string,
  allowZero: boolean = true
): { isValid: boolean; error?: ValidationError } {
  // Check if value exists
  if (value === null || value === undefined) {
    if (allowZero) {
      return { isValid: true } // Treat as 0
    }
    return { isValid: false, error: { field: fieldName, message: `${fieldName} es requerido` } }
  }

  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  // Check if it's a valid number
  if (typeof numValue !== 'number' || isNaN(numValue)) {
    return {
      isValid: false,
      error: { field: fieldName, message: `${fieldName} debe ser un número válido` },
    }
  }

  // Check for Infinity
  if (!isFinite(numValue)) {
    return {
      isValid: false,
      error: { field: fieldName, message: `${fieldName} contiene un valor inválido (infinito)` },
    }
  }

  // Check if negative
  if (numValue < 0) {
    return {
      isValid: false,
      error: { field: fieldName, message: `${fieldName} no puede ser negativo` },
    }
  }

  // Check if zero is not allowed
  if (!allowZero && numValue === 0) {
    return {
      isValid: false,
      error: { field: fieldName, message: `${fieldName} debe ser mayor a 0` },
    }
  }

  return { isValid: true }
}

/**
 * Validates an object with multiple numeric fields
 * @param obj - Object containing fields to validate
 * @param fields - Array of field names to validate
 * @param allowZeroFields - Set of field names that should NOT allow zero (optional)
 * @returns { isValid: boolean, errors?: ValidationError[] }
 */
export function validateNumericFields(
  obj: Record<string, any>,
  fields: string[],
  allowZeroFields: Set<string> = new Set()
): { isValid: boolean; errors?: ValidationError[] } {
  const errors: ValidationError[] = []

  for (const field of fields) {
    const allowZero = !allowZeroFields.has(field)
    const result = validateNumericAmount(obj[field], field, allowZero)
    if (!result.isValid && result.error) {
      errors.push(result.error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Specific validator for credit card amounts
 */
export function validateCreditCardAmounts(body: Record<string, any>): {
  isValid: boolean
  errors?: ValidationError[]
} {
  const fieldsToValidate = [
    'credit_limit',
    'current_balance',
    'minimum_payment',
    'interest_rate',
  ]

  return validateNumericFields(body, fieldsToValidate)
}

/**
 * Specific validator for loan amounts
 */
export function validateLoanAmounts(body: Record<string, any>): {
  isValid: boolean
  errors?: ValidationError[]
} {
  const fieldsToValidate = [
    'initial_amount',
    'interest_rate',
    'current_balance',
    'loan_term_years',
    'total_installments',
    'paid_installments',
    'installment_amount',
  ]

  // Fields that should NOT allow zero
  const noZeroFields = new Set(['initial_amount'])

  return validateNumericFields(body, fieldsToValidate, noZeroFields)
}

/**
 * Specific validator for budget item amounts (income/expense)
 */
export function validateBudgetItemAmount(amount: any, itemType: string = 'item'): {
  isValid: boolean
  error?: ValidationError
} {
  const result = validateNumericAmount(amount, `${itemType} amount`, false) // Don't allow zero for items
  return {
    isValid: result.isValid,
    error: result.error,
  }
}

/**
 * Sanitize numeric amount - convert to valid number or default
 */
export function sanitizeNumericAmount(value: any, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (typeof numValue === 'number' && isFinite(numValue) && numValue >= 0) {
    return numValue
  }
  
  return defaultValue
}
