/**
 * EXIF GPS extraction using exifr library.
 * Returns {lat, lon} or null if no GPS data found.
 */

export interface GPSCoords {
    lat: number;
    lon: number;
}

export async function extractGPS(file: File): Promise<GPSCoords | null> {
    try {
        // Dynamic import so it doesn't block anything if not needed
        const exifr = await import('exifr');
        const gps = await exifr.gps(file);
        if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
            return { lat: gps.latitude, lon: gps.longitude };
        }
        return null;
    } catch {
        return null;
    }
}
