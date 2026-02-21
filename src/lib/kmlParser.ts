export interface KmlPlacemark {
  id: string;
  name: string;
  type: 'point' | 'polygon' | 'linestring';
  coordinates: [number, number][] | [number, number];
  style: {
    stroke?: string;
    strokeOpacity?: number;
    fillOpacity?: number;
  };
  category: string;
}

function parseCoordinates(coordStr: string): [number, number][] {
  return coordStr
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [lng, lat] = pair.split(',').map(Number);
      return [lat, lng] as [number, number];
    })
    .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
}

function categorize(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('golf')) return 'Golf';
  if (lower.includes('marina')) return 'Marina';
  if (lower.includes('route')) return 'Infrastructure';
  if (lower.includes('one green')) return 'Résidentiel';
  if (lower.includes('polygon')) return 'Parcelles';
  if (lower.includes('extension') || lower.includes('east') || lower.includes('songon')) return 'Résidentiel';
  if (lower.includes('tf')) return 'Terrain';
  return 'Autre';
}

export function parseKml(kmlText: string): KmlPlacemark[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');
  const placemarks = doc.querySelectorAll('Placemark');
  const results: KmlPlacemark[] = [];

  placemarks.forEach((pm, idx) => {
    const name = pm.querySelector('name')?.textContent || `Zone ${idx + 1}`;
    const id = pm.getAttribute('id') || `pm-${idx}`;

    // Extract extended data
    const dataElements = pm.querySelectorAll('ExtendedData Data');
    const extData: Record<string, string> = {};
    dataElements.forEach((d) => {
      const key = d.getAttribute('name') || '';
      const val = d.querySelector('value')?.textContent || '';
      extData[key] = val;
    });

    const style = {
      stroke: extData['stroke'] || '#2a7d5f',
      strokeOpacity: extData['stroke-opacity'] ? Number(extData['stroke-opacity']) : 1,
      fillOpacity: extData['fill-opacity'] ? Number(extData['fill-opacity']) : 0.3,
    };

    const polygon = pm.querySelector('Polygon');
    const point = pm.querySelector('Point');
    const lineString = pm.querySelector('LineString');

    if (polygon) {
      const coordStr = polygon.querySelector('coordinates')?.textContent || '';
      const coords = parseCoordinates(coordStr);
      if (coords.length > 0) {
        results.push({ id, name, type: 'polygon', coordinates: coords, style, category: categorize(name) });
      }
    } else if (lineString) {
      const coordStr = lineString.querySelector('coordinates')?.textContent || '';
      const coords = parseCoordinates(coordStr);
      if (coords.length > 0) {
        results.push({ id, name, type: 'linestring', coordinates: coords, style, category: categorize(name) });
      }
    } else if (point) {
      const coordStr = point.querySelector('coordinates')?.textContent || '';
      const coords = parseCoordinates(coordStr);
      if (coords.length > 0) {
        results.push({ id, name, type: 'point', coordinates: coords[0], style, category: categorize(name) });
      }
    }
  });

  return results;
}
