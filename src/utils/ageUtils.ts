/**
 * VoiceBridge AI — Centralized Age & Date of Birth Calculation Utility
 *
 * Requirements:
 * - date_of_birth is the single source of truth for citizen age.
 * - Dynamically calculates age against the reference date (defaults to current date).
 * - Correctly accounts for whether the citizen's birthday has occurred in the reference year.
 * - Accurately handles leap years (e.g. Feb 29).
 * - Gracefully rejects invalid dates, future dates, and unrealistic ages (> 130).
 * - Never returns a misleading age when DOB is missing or invalid.
 */

export interface AgeCalculationResult {
  age: number | null;
  isValid: boolean;
  error?: string;
}

/**
 * Parses various date string representations into a valid Date object.
 * Supports:
 * - ISO formats: 'YYYY-MM-DD', 'YYYY/MM/DD'
 * - Indian/UK formats: 'DD/MM/YYYY', 'DD-MM-YYYY'
 */
export function parseDateOfBirth(dob: string | Date | null | undefined): Date | null {
  if (!dob) return null;

  if (dob instanceof Date) {
    return isNaN(dob.getTime()) ? null : dob;
  }

  const trimmed = dob.trim();
  if (!trimmed) return null;

  // Pattern 1: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1; // 0-indexed
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    // Verify valid calendar day (e.g., Feb 31 doesn't overflow to Mar)
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }

  // Pattern 2: YYYY-MM-DD or standard parseable string
  const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }

  // Fallback to Date.parse
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

/**
 * Calculates current age in full completed years from a given Date of Birth.
 *
 * @param dob Date of birth as a string ('YYYY-MM-DD', 'DD/MM/YYYY') or Date object.
 * @param referenceDate Optional reference date (defaults to new Date()).
 * @returns Age as an integer (0-130), or null if DOB is missing, invalid, or in the future.
 */
export function calculateAge(
  dob: string | Date | null | undefined,
  referenceDate: Date = new Date()
): number | null {
  const birthDate = parseDateOfBirth(dob);
  if (!birthDate) return null;

  // Reject future birth dates
  if (birthDate.getTime() > referenceDate.getTime()) {
    return null;
  }

  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth();
  const birthDay = birthDate.getDate();

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  let age = refYear - birthYear;

  // Birthday has not occurred yet this year if:
  // 1. Current month is before birth month, OR
  // 2. In the same month, but current day is before birth day
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age--;
  }

  // Sanity check: valid non-negative age under 130
  if (age < 0 || age > 130) {
    return null;
  }

  return age;
}

/**
 * Formats a Date or string to 'YYYY-MM-DD' for HTML5 <input type="date"> elements.
 */
export function formatDateForInput(dob: string | Date | null | undefined): string {
  const d = parseDateOfBirth(dob);
  if (!d) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Validates whether a given DOB is valid, not in the future, and yields an age between 0 and 130.
 */
export function validateDateOfBirth(
  dob: string | Date | null | undefined,
  referenceDate: Date = new Date()
): AgeCalculationResult {
  if (!dob || (typeof dob === 'string' && !dob.trim())) {
    return { age: null, isValid: false, error: 'Date of birth is required.' };
  }

  const parsed = parseDateOfBirth(dob);
  if (!parsed) {
    return { age: null, isValid: false, error: 'Invalid date format. Use YYYY-MM-DD or DD/MM/YYYY.' };
  }

  if (parsed.getTime() > referenceDate.getTime()) {
    return { age: null, isValid: false, error: 'Date of birth cannot be in the future.' };
  }

  const age = calculateAge(parsed, referenceDate);
  if (age === null) {
    return { age: null, isValid: false, error: 'Calculated age is outside the valid range (0-130 years).' };
  }

  return { age, isValid: true };
}
