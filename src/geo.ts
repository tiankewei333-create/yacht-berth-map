/** Geographic helpers. Bearings are degrees clockwise from north. */

export type LngLat = [number, number];

const EARTH_M = 6378137;

export function bearing(a: LngLat, b: LngLat): number {
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function distance(a: LngLat, b: LngLat): number {
  const φ1 = (a[1] * Math.PI) / 180;
  const φ2 = (b[1] * Math.PI) / 180;
  const Δφ = φ2 - φ1;
  const Δλ = ((b[0] - a[0]) * Math.PI) / 180;
  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function offset(origin: LngLat, bearingDeg: number, distanceM: number): LngLat {
  const δ = distanceM / EARTH_M;
  const θ = (bearingDeg * Math.PI) / 180;
  const φ1 = (origin[1] * Math.PI) / 180;
  const λ1 = (origin[0] * Math.PI) / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return [((λ2 * 180) / Math.PI + 540) % 360 - 180, (φ2 * 180) / Math.PI];
}

export function along(start: LngLat, end: LngLat, distanceM: number): LngLat {
  return offset(start, bearing(start, end), distanceM);
}

/** Rectangle with the stern edge centered on `stern`. Bow points along `headingDeg`. */
export function footprint(stern: LngLat, headingDeg: number, lengthM: number, beamM: number): LngLat[] {
  const bow = offset(stern, headingDeg, lengthM);
  const port = (headingDeg - 90 + 360) % 360;
  const half = beamM / 2;
  const a = offset(stern, port, half);
  const b = offset(bow, port, half);
  const c = offset(bow, (port + 180) % 360, half);
  const d = offset(stern, (port + 180) % 360, half);
  return [a, b, c, d, a];
}

/** Hull outline: full beam until the shoulder, then a point at the bow. */
export function hullFootprint(stern: LngLat, headingDeg: number, lengthM: number, beamM: number): LngLat[] {
  const port = (headingDeg - 90 + 360) % 360;
  const starboard = (port + 180) % 360;
  const half = beamM / 2;
  const shoulder = offset(stern, headingDeg, lengthM * 0.66);
  const bow = offset(stern, headingDeg, lengthM);
  const sternPort = offset(stern, port, half);
  const sternStar = offset(stern, starboard, half);
  const shoulderPort = offset(shoulder, port, half);
  const shoulderStar = offset(shoulder, starboard, half);
  return [sternPort, shoulderPort, bow, shoulderStar, sternStar, sternPort];
}
