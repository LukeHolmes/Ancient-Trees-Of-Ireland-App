export interface BasemapConfig {
  url: string
  attribution: string
  /** Applied to the Leaflet map container when using the fallback basemap. */
  containerClassName?: string
}

/**
 * CARTO raster tiles require an API key since Sep 2025. When no key is configured,
 * fall back to OpenStreetMap so the map stays usable out of the box.
 */
export function getBasemapConfig(): BasemapConfig {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim()

  if (key) {
    return {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(key)}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    }
  }

  return {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    containerClassName: 'map-basemap-osm-fallback',
  }
}
