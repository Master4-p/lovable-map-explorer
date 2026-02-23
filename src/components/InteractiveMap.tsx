import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseKml, KmlPlacemark } from '@/lib/kmlParser';
import { getProjectInfo } from '@/lib/projectData';

// Premium zone colors — distinct, intentional palette
const ZONE_STYLES: Record<string, { fill: string; border: string; label: string }> = {
  'Polygon 323': { fill: 'rgba(16, 185, 129, 0.28)', border: '#0d9668', label: 'Songon Extension' },
  'Polygon 2FD': { fill: 'rgba(220, 38, 38, 0.25)', border: '#b91c1c', label: 'Zone Résidentielle A' },
  'Polygon 2E6': { fill: 'rgba(139, 92, 246, 0.30)', border: '#7c3aed', label: 'Marina' },
  'Polygon 1D4': { fill: 'rgba(34, 197, 94, 0.25)', border: '#16a34a', label: 'Songon East-Side' },
  'Polygon 1D2': { fill: 'rgba(249, 115, 22, 0.28)', border: '#ea580c', label: 'Zone Résidentielle B' },
};

const MARKER_COLORS: Record<string, string> = {
  'PROJET MARINA': '#8b5cf6',
  'Songon East-Side': '#22c55e',
  'Terre de Songon': '#f97316',
  'Songon Extension': '#10b981',
  'Le Golf de Songon': '#3b82f6',
};

function getZoneStyle(name: string) {
  return ZONE_STYLES[name] || { fill: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', label: name };
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
          <span class="bubble-badge" style="background:${MARKER_COLORS[placemark.name] || style.border}">${placemark.category}</span>
        </div>
      </div>
      <div class="bubble-content">
        <h3 class="bubble-title">${displayName}</h3>
        <p class="bubble-desc">${info.description}</p>
        <div class="bubble-footer">
          <div class="bubble-status">
            <span class="bubble-dot" style="background:${MARKER_COLORS[placemark.name] || style.border}"></span>
            <span style="color:${MARKER_COLORS[placemark.name] || style.border}">${info.status}</span>
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

    // Satellite tiles — desaturated via CSS
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
    }).addTo(map);

    // Custom zoom control — minimal, bottom-right
    const zoomControl = L.control.zoom({ position: 'bottomright' });
    zoomControl.addTo(map);

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
              const perimeterPoly = L.polygon(coords, {
                color: '#10b981',
                weight: 2,
                dashArray: '12 8',
                fillColor: 'transparent',
                fillOpacity: 0,
                opacity: 0.6,
                className: 'perimeter-animate',
              });

              // Tooltip at northeast on hover
              const ne = perimeterPoly.getBounds().getNorthEast();
              const center = perimeterPoly.getBounds().getCenter();
              const tooltipLatLng = L.latLng(
                center.lat + (ne.lat - center.lat) * 0.7,
                center.lng + (ne.lng - center.lng) * 0.7
              );
              const tooltipMarker = L.marker(tooltipLatLng, { opacity: 0, interactive: false });
              tooltipMarker.addTo(map);

              perimeterPoly.on('mouseover', () => {
                tooltipMarker.bindTooltip('One Green Dev', {
                  permanent: true,
                  direction: 'top',
                  className: 'ogd-tooltip',
                }).openTooltip();
              });
              perimeterPoly.on('mouseout', () => {
                tooltipMarker.closeTooltip();
                tooltipMarker.unbindTooltip();
              });

              perimeterPoly.addTo(map);
              return;
            }

            // Styled zone polygon
            const zoneStyle = getZoneStyle(pm.name);
            const poly = L.polygon(coords, {
              color: zoneStyle.border,
              weight: 2,
              fillColor: zoneStyle.fill,
              fillOpacity: 1, // opacity is baked into rgba
              opacity: 0.9,
              className: 'masterplan-zone',
            });

            const zoneCenter = poly.getBounds().getCenter();

            // Tooltip on hover instead of static label
            poly.bindTooltip(zoneStyle.label, {
              direction: 'center',
              className: 'zone-tooltip',
              permanent: false,
            });

            // Hover highlight
            poly.on('mouseover', function () {
              this.setStyle({ weight: 3.5, opacity: 1, fillOpacity: 1.4 });
              this.getElement()?.classList.add('zone-hover');
              this.bringToFront();
            });
            poly.on('mouseout', function () {
              this.setStyle({ weight: 2, opacity: 0.9, fillOpacity: 1 });
              this.getElement()?.classList.remove('zone-hover');
            });

            // Click — show info bubble (one at a time)
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

            poly.addTo(map);

          } else if (pm.type === 'point') {
            const coord = pm.coordinates as [number, number];
            const pinColor = MARKER_COLORS[pm.name] || '#10b981';

            const icon = L.divIcon({
              className: 'masterplan-pin',
              html: `
                <div class="pin-outer" style="--pin-color:${pinColor}">
                  <div class="pin-inner" style="background:${pinColor}">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <div class="pin-pulse" style="background:${pinColor}"></div>
                </div>
              `,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
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

            // Hover tooltip with name
            const info = getProjectInfo(pm.name);
            marker.bindTooltip(pm.name, {
              direction: 'top',
              offset: L.point(0, -14),
              className: 'pin-tooltip',
            });

            marker.addTo(map);

          } else if (pm.type === 'linestring') {
            const coords = pm.coordinates as [number, number][];
            const line = L.polyline(coords, {
              color: '#7a5c8e',
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
