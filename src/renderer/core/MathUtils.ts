/**
 * Math utility functions for coordinate precision
 */

/**
 * Round a number to 3 decimal places
 * @param value The number to round
 * @returns The rounded number
 */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Round a Point to 3 decimal places
 * @param point The point to round
 * @returns A new point with rounded coordinates
 */
export function roundPoint(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: round3(point.x),
    y: round3(point.y)
  };
}
