import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseKml, KmlPlacemark } from '@/lib/kmlParser';
import { getProjectInfo } from '@/lib/projectData';

// Premium zone colors — distinct, intentional palette
const ZONE_STYLES: Record<string, { fill: string; border: string; label: string; interactive?: boolean }> = {
  'Polygon 323': { fill: 'rgba(212, 175, 55, 0.40)', border: '#d4af37', label: 'Songon Extension' },
  'Polygon 2FD': { fill: 'rgba(180, 100, 60, 0.40)', border: '#b4643c', label: 'Zone Résidentielle A' },
  'Polygon 2E6': { fill: 'rgba(140, 160, 200, 0.35)', border: '#8ca0c8', label: 'Marina', interactive: false },
  'Polygon 1D4': { fill: 'rgba(200, 160, 120, 0.40)', border: '#c8a078', label: 'Songon East-Side' },
  'Polygon 1D2': { fill: 'rgba(180, 100, 60, 0.40)', border: '#b4643c', label: 'Zone Résidentielle B', interactive: false },
};

// Marker config — color, category icon SVG, abbreviation
const MARKER_CONFIG: Record<string, { color: string; icon: string; abbr: string }> = {
  'PROJET MARINA': {
    color: '#8ca0c8',
    abbr: 'M',
    icon: '<path d="M3 18V12C3 12 5 8 12 8C19 8 21 12 21 12V18" stroke-width="1.5" stroke-linecap="round"/><path d="M6 18V14" stroke-width="1.5"/><path d="M12 18V10" stroke-width="1.5"/><path d="M18 18V14" stroke-width="1.5"/>',
  },
  'Songon East-Side': {
    color: '#c8a078',
    abbr: 'SE',
    icon: '<rect x="4" y="8" width="6" height="10" rx="1" stroke-width="1.5"/><rect x="14" y="5" width="6" height="13" rx="1" stroke-width="1.5"/><line x1="2" y1="18" x2="22" y2="18" stroke-width="1.5"/>',
  },
  'Terre de Songon': {
    color: '#b4643c',
    abbr: 'TS',
    icon: '<rect x="4" y="8" width="16" height="10" rx="1" stroke-width="1.5"/><path d="M4 8L12 3L20 8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="18" x2="12" y2="12" stroke-width="1.5"/>',
  },
  'Songon Extension': {
    color: '#d4af37',
    abbr: 'EX',
    icon: '<circle cx="12" cy="12" r="3" stroke-width="1.5"/><path d="M12 2V5" stroke-width="1.5" stroke-linecap="round"/><path d="M12 19V22" stroke-width="1.5" stroke-linecap="round"/><path d="M2 12H5" stroke-width="1.5" stroke-linecap="round"/><path d="M19 12H22" stroke-width="1.5" stroke-linecap="round"/>',
  },
  'Le Golf de Songon': {
    color: '#e8c96a',
    abbr: 'G',
    icon: '<circle cx="12" cy="8" r="2" stroke-width="1.5"/><path d="M12 10V18" stroke-width="1.5" stroke-linecap="round"/><path d="M8 18C8 18 10 16 12 18C14 20 16 18 16 18" stroke-width="1.5" stroke-linecap="round"/>',
  },
};

function getZoneStyle(name: string) {
  return ZONE_STYLES[name] || { fill: 'rgba(160, 140, 130, 0.35)', border: '#a08c82', label: name, interactive: true };
}

function createInfoBubble(placemark: KmlPlacemark): string {
  const info = getProjectInfo(placemark.name);
  const style = getZoneStyle(placemark.name);
  const displayName = style.label || placemark.name;

  return `
    <div class="masterplan-bubble">
      <div class="bubble-image">
        <img src="${info.image}" alt="${displayName}" loading="lazy" onerror="this.style.display='none'" />
        <div class="bubble-image-overlay">
          <span class="bubble-badge" style="background:${MARKER_CONFIG[placemark.name]?.color || style.border}">${placemark.category}</span>
        </div>
      </div>
      <div class="bubble-content">
        <h3 class="bubble-title">${displayName}</h3>
        <p class="bubble-desc">${info.description}</p>
        <div class="bubble-footer">
          <div class="bubble-status">
            <span class="bubble-dot" style="background:${MARKER_CONFIG[placemark.name]?.color || style.border}"></span>
            <span style="color:${MARKER_CONFIG[placemark.name]?.color || style.border}">${info.status}</span>
          </div>
          ${info.link ? `<a href="${info.link}" target="_blank" rel="noopener noreferrer" class="bubble-cta">Découvrir</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

const InteractiveMap = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const activePopupRef = useRef<L.Popup | null>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: true,
      minZoom: 13,
      maxZoom: 17,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      inertia: true,
      inertiaDeceleration: 3000,
    }).setView([5.330, -4.272], 14);

    // Restrict panning to project area
    const bounds = L.latLngBounds(
      L.latLng(5.295, -4.310),
      L.latLng(5.365, -4.235)
    );
    map.setMaxBounds(bounds);

    // Satellite tiles — desaturated via CSS for premium look
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    // Close any open popup when clicking empty area
    map.on('click', () => {
      if (activePopupRef.current) {
        map.closePopup(activePopupRef.current);
        activePopupRef.current = null;
      }
    });

    // Load KML data
    fetch('/data/map_ogd.kml')
      .then((r) => r.text())
      .then((text) => {
        const placemarks = parseKml(text);

        placemarks.forEach((pm) => {
          if (pm.type === 'polygon') {
            const coords = pm.coordinates as [number, number][];

            // Global perimeter — dashed outline, no fill
            if (pm.name === 'Polygon 356') {
              // Draw a dashed circle instead of the rectangle
              const tempPoly = L.polygon(coords);
              const bounds = tempPoly.getBounds();
              const center = bounds.getCenter();
              const ne = bounds.getNorthEast();
              const sw = bounds.getSouthWest();
              const widthMeters = center.distanceTo(L.latLng(center.lat, ne.lng));
              const heightMeters = center.distanceTo(L.latLng(ne.lat, center.lng));
              const radius = Math.max(widthMeters, heightMeters);

              const perimeterCircle = L.circle(center, {
                radius,
                color: '#ffffff',
                weight: 3,
                dashArray: '12 8',
                fillColor: 'transparent',
                fillOpacity: 0,
                opacity: 0.6,
                interactive: false,
              });

              perimeterCircle.addTo(map);
              return;
            }

            // Styled zone polygon
            const zoneStyle = getZoneStyle(pm.name);
            const isInteractive = zoneStyle.interactive !== false;
            const poly = L.polygon(coords, {
              color: zoneStyle.border,
              weight: 2,
              fillColor: zoneStyle.fill,
              fillOpacity: 1,
              opacity: 0.9,
              className: isInteractive ? 'masterplan-zone' : 'masterplan-zone-static',
              interactive: isInteractive,
            });

            if (isInteractive) {
              const zoneCenter = poly.getBounds().getCenter();

              poly.bindTooltip(zoneStyle.label, {
                direction: 'center',
                className: 'zone-tooltip',
                permanent: false,
              });

              poly.on('mouseover', function () {
                this.setStyle({ weight: 3, opacity: 1, fillOpacity: 1.75 });
                this.getElement()?.classList.add('zone-hover');
                this.bringToFront();
              });
              poly.on('mouseout', function () {
                this.setStyle({ weight: 2, opacity: 0.9, fillOpacity: 1 });
                this.getElement()?.classList.remove('zone-hover');
              });

              poly.on('click', (e) => {
                L.DomEvent.stopPropagation(e);
                if (activePopupRef.current) {
                  map.closePopup(activePopupRef.current);
                }
                const popup = L.popup({
                  maxWidth: 300,
                  minWidth: 260,
                  className: 'masterplan-popup',
                  closeButton: true,
                  autoPan: true,
                  autoPanPaddingTopLeft: L.point(50, 50),
                  autoPanPaddingBottomRight: L.point(50, 50),
                })
                  .setLatLng(zoneCenter)
                  .setContent(createInfoBubble(pm))
                  .openOn(map);
                activePopupRef.current = popup;
              });
            }

            poly.addTo(map);

          } else if (pm.type === 'point') {
            const coord = pm.coordinates as [number, number];
            const markerCfg = MARKER_CONFIG[pm.name] || { color: '#10b981', abbr: '•', icon: '<circle cx="12" cy="12" r="4" stroke-width="1.5"/>' };

            const icon = L.divIcon({
              className: 'masterplan-marker',
              html: `
                <div class="marker-shell" style="--marker-color:${markerCfg.color}">
                  <div class="marker-glow"></div>
                  <div class="marker-body">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
                      ${markerCfg.icon}
                    </svg>
                  </div>
                  <span class="marker-abbr">${markerCfg.abbr}</span>
                </div>
              `,
              iconSize: [36, 44],
              iconAnchor: [18, 22],
            });

            const marker = L.marker(coord, { icon });

            marker.on('click', (e) => {
              L.DomEvent.stopPropagation(e);
              if (activePopupRef.current) {
                map.closePopup(activePopupRef.current);
              }
              const popup = L.popup({
                maxWidth: 300,
                minWidth: 260,
                className: 'masterplan-popup',
                closeButton: true,
                autoPan: true,
              })
                .setLatLng(coord)
                .setContent(createInfoBubble(pm))
                .openOn(map);
              activePopupRef.current = popup;
            });

            marker.bindTooltip(pm.name, {
              direction: 'top',
              offset: L.point(0, -18),
              className: 'pin-tooltip',
            });

            marker.addTo(map);

          } else if (pm.type === 'linestring') {
            const coords = pm.coordinates as [number, number][];
            const line = L.polyline(coords, {
              color: '#375a41',
              weight: 2,
              opacity: 0.6,
              dashArray: '6 4',
              className: 'masterplan-route',
            });
            line.addTo(map);
          }
        });
      });

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  return (
    <div className="relative flex-1 w-full h-full masterplan-container">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default InteractiveMap;
