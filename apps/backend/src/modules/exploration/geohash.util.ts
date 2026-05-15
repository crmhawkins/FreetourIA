/**
 * Geohash encoding utility.
 *
 * Pure TypeScript implementation of the standard Geohash algorithm
 * (base32 alphabet "0123456789bcdefghjkmnpqrstuvwxyz").
 *
 * Precision reference (approximate cell size):
 *   - precision 5  → ~4.9 km
 *   - precision 6  → ~1.2 km  (used for Overpass cache keys)
 *   - precision 7  → ~150 m   (used for Nominatim cache keys)
 *   - precision 8  → ~38 m
 *
 * See https://en.wikipedia.org/wiki/Geohash for the algorithm.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encodes a (latitude, longitude) pair into a geohash string at the given precision.
 *
 * @param lat       Latitude in degrees  (-90..90)
 * @param lon       Longitude in degrees (-180..180)
 * @param precision Number of base32 characters in the output (default 7)
 * @returns         Geohash string
 */
export function geohashEncode(lat: number, lon: number, precision = 7): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error('geohashEncode: lat/lon must be finite numbers');
  }
  if (precision < 1 || precision > 12) {
    throw new Error('geohashEncode: precision must be between 1 and 12');
  }

  let latMin = -90;
  let latMax = 90;
  let lonMin = -180;
  let lonMax = 180;

  let hash = '';
  let bits = 0;
  let bit = 0;
  // Geohash interleaves bits: even bits -> longitude, odd bits -> latitude.
  let evenBit = true;

  while (hash.length < precision) {
    if (evenBit) {
      // longitude
      const mid = (lonMin + lonMax) / 2;
      if (lon >= mid) {
        bits = (bits << 1) | 1;
        lonMin = mid;
      } else {
        bits = bits << 1;
        lonMax = mid;
      }
    } else {
      // latitude
      const mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        latMin = mid;
      } else {
        bits = bits << 1;
        latMax = mid;
      }
    }

    evenBit = !evenBit;
    bit++;

    // Every 5 bits → one base32 character.
    if (bit === 5) {
      hash += BASE32.charAt(bits);
      bits = 0;
      bit = 0;
    }
  }

  return hash;
}
