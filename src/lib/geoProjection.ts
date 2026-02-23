// Simple Mercator-like projection from lat/lng to flat XZ plane
// Centers the project area around (0, 0)

const CENTER_LAT = 5.330;
const CENTER_LNG = -4.272;
const SCALE = 8000; // meters per degree approx at this latitude

export function latLngToXZ(lat: number, lng: number): [number, number] {
  const x = (lng - CENTER_LNG) * SCALE;
  const z = -(lat - CENTER_LAT) * SCALE; // flip Z so north is "up"
  return [x, z];
}

export function coordsToXZ(coords: [number, number][]): [number, number][] {
  return coords.map(([lat, lng]) => latLngToXZ(lat, lng));
}

export { CENTER_LAT, CENTER_LNG, SCALE };
