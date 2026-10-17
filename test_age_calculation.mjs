// Test Suite for ageUtils logic
import assert from 'assert';

// Import or re-implement pure JS equivalent for Node.js test execution
function parseDateOfBirth(dob) {
  if (!dob) return null;
  if (dob instanceof Date) return isNaN(dob.getTime()) ? null : dob;
  const trimmed = String(dob).trim();
  if (!trimmed) return null;

  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const date = new Date(year, month, day);
    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
      return date;
    }
    return null;
  }

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

  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

function calculateAge(dob, referenceDate = new Date()) {
  const birthDate = parseDateOfBirth(dob);
  if (!birthDate) return null;
  if (birthDate.getTime() > referenceDate.getTime()) return null;

  const birthYear = birthDate.getFullYear();
  const birthMonth = birthDate.getMonth();
  const birthDay = birthDate.getDate();

  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth();
  const refDay = referenceDate.getDate();

  let age = refYear - birthYear;
  if (refMonth < birthMonth || (refMonth === birthMonth && refDay < birthDay)) {
    age--;
  }

  if (age < 0 || age > 130) return null;
  return age;
}

console.log('Running Dynamic Age Calculation Boundary Tests...');

// Reference date: October 13, 2026
const ref = new Date(2026, 9, 13); // month is 0-indexed: 9 = October

// 1. Birthday occurred earlier this year (e.g. August 15, 2002)
assert.strictEqual(calculateAge('2002-08-15', ref), 24, 'Born 2002-08-15 should be 24 on 2026-10-13');
assert.strictEqual(calculateAge('15/08/2002', ref), 24, 'DD/MM/YYYY format should be supported');

// 2. Birthday is TODAY (October 13, 2000) -> Turned 26 today
assert.strictEqual(calculateAge('2000-10-13', ref), 26, 'Birthday today should increment age');

// 3. Birthday is TOMORROW (October 14, 2000) -> Still 25 today
assert.strictEqual(calculateAge('2000-10-14', ref), 25, 'Birthday tomorrow should NOT increment age yet');

// 4. Birthday was YESTERDAY (October 12, 2000) -> Turned 26 yesterday
assert.strictEqual(calculateAge('2000-10-12', ref), 26, 'Birthday yesterday should have incremented age');

// 5. Birthday late in the year (December 31, 2000) -> Still 25
assert.strictEqual(calculateAge('2000-12-31', ref), 25, 'Born Dec 31 2000 should be 25 in Oct 2026');

// 6. Birthday early in the year (January 1, 2000) -> 26
assert.strictEqual(calculateAge('2000-01-01', ref), 26, 'Born Jan 1 2000 should be 26 in Oct 2026');

// 7. Leap year baby: Feb 29, 2004 on Feb 28, 2026 vs Mar 1, 2026
const refFeb28 = new Date(2026, 1, 28);
const refMar1 = new Date(2026, 2, 1);
assert.strictEqual(calculateAge('2004-02-29', refFeb28), 21, 'Leap year birthday not reached by Feb 28');
assert.strictEqual(calculateAge('2004-02-29', refMar1), 22, 'Leap year birthday reached by Mar 1 in non-leap year');

// 8. Future date -> should return null
assert.strictEqual(calculateAge('2026-10-14', ref), null, 'Future date should return null');
assert.strictEqual(calculateAge('2030-01-01', ref), null, 'Far future date should return null');

// 9. Unrealistic age (> 130) -> should return null
assert.strictEqual(calculateAge('1800-01-01', ref), null, 'Age > 130 should return null');

// 10. Missing / invalid inputs -> should return null
assert.strictEqual(calculateAge(null, ref), null, 'null DOB should return null');
assert.strictEqual(calculateAge(undefined, ref), null, 'undefined DOB should return null');
assert.strictEqual(calculateAge('', ref), null, 'empty DOB should return null');
assert.strictEqual(calculateAge('invalid-date-string', ref), null, 'invalid string should return null');
assert.strictEqual(calculateAge('31/02/2000', ref), null, 'impossible calendar day Feb 31 should return null');

console.log('✅ ALL 10 DYNAMIC AGE BOUNDARY TESTS PASSED PERFECTLY!');
