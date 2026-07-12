// Geocoding helpers.
//  - Forward search (city name -> coordinates) uses Open-Meteo's geocoding API.
//  - Reverse lookup (coordinates -> place name) uses BigDataCloud's free,
//    key-less, CORS-enabled client endpoint.

import type { Place } from "./weather";

export async function searchPlaces(query: string): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}` +
    `&count=8&language=en&format=json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const data = await res.json();

  if (!Array.isArray(data.results)) return [];

  return data.results.map((r: any) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    admin1: r.admin1,
    country: r.country,
    timezone: r.timezone,
  }));
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<Place> {
  const fallback: Place = {
    name: "Current Location",
    latitude,
    longitude,
  };

  try {
    const url =
      `https://api.bigdatacloud.net/data/reverse-geocode-client` +
      `?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return fallback;
    const data = await res.json();

    const name =
      data.city ||
      data.locality ||
      data.principalSubdivision ||
      "Current Location";

    return {
      name,
      latitude,
      longitude,
      admin1: data.principalSubdivision || undefined,
      country: data.countryName || undefined,
    };
  } catch {
    return fallback;
  }
}

/** A concise, human-friendly place label, e.g. "London, England". */
export function formatPlaceLabel(place: Place): string {
  const parts = [place.name];
  if (place.admin1 && place.admin1 !== place.name) parts.push(place.admin1);
  else if (place.country) parts.push(place.country);
  return parts.join(", ");
}
