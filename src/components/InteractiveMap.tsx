import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseKml, KmlPlacemark } from '@/lib/kmlParser';
import { getProjectInfo } from '@/lib/projectData';


const CATEGORY_COLORS: Record<string, string> = {
  'Résidentiel': '#2a7d5f',
  'Marina': '#1a6b8a',
  'Golf': '#4a8c3f',
  'Parcelles': '#c67a3e',
  'Infrastructure': '#7a5c8e',
  'Terrain': '#8a6d3b',
  'Autre': '#6b7280',
};

// Distinct color per polygon/lot name for visual differentiation
const LOT_COLORS: Record<string, string> = {
  'Polygon 356': 'rgba(0,0,0,0)',
  'Polygon 323': '#10b981',
  'Polygon 2FD': '#e53935',
  'Polygon 2E6': '#8e24aa',
  'Polygon 1D4': '#43a047',
  'Polygon 1D2': '#f4511e',
  'Songon East-Side': '#43a047',
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6b7280';
}

function getLotColor(name: string, category: string): string {
  return LOT_COLORS[name] || CATEGORY_COLORS[category] || '#6b7280';
}

function createPopupContent(placemark: KmlPlacemark): string {
  const info = getProjectInfo(placemark.name);
  const color = getLotColor(placemark.name, placemark.category);

  return `
    <div style="font-family: 'DM Sans', sans-serif;">
      <div style="position:relative; width:100%; height:160px; overflow:hidden;">
        <img 
          src="${info.image}" 
          alt="${placemark.name}" 
          loading="lazy"
          style="width:100%; height:100%; object-fit:cover;"
          onerror="this.style.display='none'"
        />
        <div style="position:absolute;bottom:0;left:0;right:0;padding:8px 14px;background:linear-gradient(transparent,rgba(10,26,15,0.85));">
          <span style="color:white;font-size:11px;font-weight:500;background:${color};padding:2px 8px;border-radius:20px;">
            ${placemark.category}
          </span>
        </div>
      </div>
      <div style="padding:14px 16px 16px;background:#0d1f14;color:#e0ebe4;">
        <h3 style="font-family:'Playfair Display',serif;font-size:16px;font-weight:600;margin:0 0 6px;color:#ffffff;">
          ${placemark.name}
        </h3>
        <p style="font-size:12px;color:#8aa696;margin:0 0 10px;line-height:1.5;">
          ${info.description}
        </p>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:6px;height:6px;border-radius:50%;background:${color};"></span>
            <span style="font-size:11px;font-weight:500;color:${color};">${info.status}</span>
          </div>
          ${info.link ? `<a href="${info.link}" target="_blank" rel="noopener noreferrer" style="
            font-size:12px;font-weight:600;color:#0a1a0f;background:#10b981;
            padding:5px 14px;border-radius:20px;text-decoration:none;
            transition:opacity 0.2s;
          " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">Découvrir</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

const InteractiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<Map<string, L.Layer[]>>(new Map());
  const [categories, setCategories] = useState<{ name: string; color: string; count: number; visible: boolean }[]>([]);

  const toggleCategory = useCallback((categoryName: string) => {
    setCategories((prev) =>
      prev.map((c) => {
        if (c.name === categoryName) {
          const newVisible = !c.visible;
          const layers = layersRef.current.get(categoryName) || [];
          layers.forEach((layer) => {
            if (newVisible) {
              mapInstance.current?.addLayer(layer);
            } else {
              mapInstance.current?.removeLayer(layer);
            }
          });
          return { ...c, visible: newVisible };
        }
        return c;
      })
    );
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([5.333, -4.275], 14);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© Esri',
    }).addTo(map);

    // Add labels overlay on satellite
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      pane: 'overlayPane',
    }).addTo(map);

    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© OpenStreetMap © CARTO')
      .addTo(map);

    mapInstance.current = map;

    // Load KML
    fetch('/data/map_ogd.kml')
      .then((r) => r.text())
      .then((text) => {
        const placemarks = parseKml(text);
        const bounds = L.latLngBounds([]);
        const catMap = new Map<string, { count: number; layers: L.Layer[] }>();

        placemarks.forEach((pm) => {
          const color = getLotColor(pm.name, pm.category);
          let layer: L.Layer | null = null;

        if (pm.type === 'polygon') {
            const coords = pm.coordinates as [number, number][];
            // Large perimeter polygon — render as dashed boundary, no popup
            if (pm.name === 'Polygon 356') {
              const perimeterPoly = L.polygon(coords, {
                color: '#10b981',
                weight: 2,
                dashArray: '10 6',
                fillColor: 'transparent',
                fillOpacity: 0,
                opacity: 0.6,
                interactive: false,
              });
              perimeterPoly.addTo(map);
              bounds.extend(perimeterPoly.getBounds());
              return;
            }
            const poly = L.polygon(coords, {
              color,
              weight: 2,
              fillColor: color,
              fillOpacity: 0.2,
              opacity: 0.8,
            });

            poly.on('mouseover', function () {
              this.setStyle({ fillOpacity: 0.45, weight: 3 });
            });
            poly.on('mouseout', function () {
              this.setStyle({ fillOpacity: 0.2, weight: 2 });
            });
            poly.bindPopup(createPopupContent(pm), { maxWidth: 320, className: '' });
            bounds.extend(poly.getBounds());
            layer = poly;
          } else if (pm.type === 'point') {
            const coord = pm.coordinates as [number, number];
            const icon = L.divIcon({
              className: 'custom-marker',
              html: `<div style="
                width:32px;height:32px;border-radius:50%;
                background:${color};border:3px solid white;
                box-shadow:0 2px 8px rgba(0,0,0,0.2);
                display:flex;align-items:center;justify-content:center;
                cursor:pointer;transition:transform 0.2s;
              "><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            });
            const marker = L.marker(coord, { icon });
            marker.bindPopup(createPopupContent(pm), { maxWidth: 320 });
            bounds.extend(L.latLng(coord[0], coord[1]));
            layer = marker;
          } else if (pm.type === 'linestring') {
            const coords = pm.coordinates as [number, number][];
            const line = L.polyline(coords, {
              color,
              weight: 3,
              opacity: 0.8,
              dashArray: '8 4',
            });
            line.bindPopup(createPopupContent(pm), { maxWidth: 320 });
            bounds.extend(line.getBounds());
            layer = line;
          }

          if (layer) {
            layer.addTo(map);
            const existing = catMap.get(pm.category) || { count: 0, layers: [] };
            existing.count++;
            existing.layers.push(layer);
            catMap.set(pm.category, existing);
          }
        });

        // Store layers and build categories
        const cats: { name: string; color: string; count: number; visible: boolean }[] = [];
        catMap.forEach((val, key) => {
          layersRef.current.set(key, val.layers);
          cats.push({ name: key, color: getCategoryColor(key), count: val.count, visible: true });
        });
        setCategories(cats);

        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        }
      });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="relative flex-1 w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default InteractiveMap;
