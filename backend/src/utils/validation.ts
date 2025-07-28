/**
 * Collection of helper validation functions used throughout the backend.  When
 * updating this file be mindful that the frontend may mirror some of these
 * validations to provide immediate feedback to the user.
 */

/**
 * Validates an Indian mobile number.  The function ensures the input
 * consists of exactly 10 digits.  Use a more robust solution in
 * production to handle potential formatting variations.
 */
export function isValidPhoneNumber(phone: string): boolean {
  return /^\d{10}$/.test(phone);
}

/**
 * Validates a person’s name.  Accepts letters and spaces.  Names must be
 * between 2 and 50 characters long.
 */
export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return /^[A-Za-z\s]{2,50}$/.test(trimmed);
}

/**
 * Validates a list of tags.  Each tag must be a non‑empty string without
 * special characters.  Adjust the regular expression according to your
 * localisation requirements.
 */
export function areValidTags(tags: string[]): boolean {
  return tags.every(tag => /^\w[\w\s]{0,20}$/.test(tag));
}

/**
 * Validates the radius.  Standard radius options are 5, 10, 15 or 20 km.
 */
export function isValidRadius(radius: number): boolean {
  return [5, 10, 15, 20].includes(radius);
}