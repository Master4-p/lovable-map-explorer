import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { parseKml, KmlPlacemark } from '@/lib/kmlParser';
import { getProjectInfo } from '@/lib/projectData';
import { coordsToXZ, latLngToXZ } from '@/lib/geoProjection';

// Pastel zone config for isometric maquette blanche
const ZONE_CONFIG: Record<string, { color: string; height: number; label: string }> = {
  'Polygon 323': { color: '#6ee7b7', height: 1.6, label: 'Songon Extension' },
  'Polygon 2FD': { color: '#fca5a5', height: 1.0, label: 'Zone Résidentielle A' },
  'Polygon 2E6': { color: '#c4b5fd', height: 0.8, label: 'Marina' },
  'Polygon 1D4': { color: '#86efac', height: 1.2, label: 'Songon East-Side' },
  'Polygon 1D2': { color: '#fdba74', height: 0.9, label: 'Zone Résidentielle B' },
};

const MARKER_CONFIG: Record<string, string> = {
  'PROJET MARINA': '#c4b5fd',
  'Songon East-Side': '#86efac',
  'Terre de Songon': '#fdba74',
  'Songon Extension': '#6ee7b7',
  'Le Golf de Songon': '#93c5fd',
};

// ─── Extruded Zone (flat shading, clean edges) ───
function ExtrudedZone({
  coords, config, name, placemark, isSelected, onSelect,
}: {
  coords: [number, number][];
  config: { color: string; height: number; label: string };
  name: string;
  placemark: KmlPlacemark;
  isSelected: boolean;
  onSelect: (name: string | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    coords.forEach(([x, z], i) => {
      if (i === 0) s.moveTo(x, z);
      else s.lineTo(x, z);
    });
    s.closePath();
    return s;
  }, [coords]);

  const extrudeSettings = useMemo(() => ({
    depth: config.height,
    bevelEnabled: false,
  }), [config.height]);

  const baseColor = useMemo(() => new THREE.Color(config.color), [config.color]);
  const hoverColor = useMemo(() => new THREE.Color(config.color).multiplyScalar(1.15), [config.color]);

  const center = useMemo(() => {
    const cx = coords.reduce((s, [x]) => s + x, 0) / coords.length;
    const cz = coords.reduce((s, [, z]) => s + z, 0) / coords.length;
    return [cx, config.height + 0.4, cz] as [number, number, number];
  }, [coords, config.height]);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const target = hovered || isSelected ? hoverColor : baseColor;
    mat.color.lerp(target, 0.12);
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : name); }}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.85}
          metalness={0}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Top edge outline */}
      <lineLoop rotation={[-Math.PI / 2, 0, 0]} position={[0, config.height + 0.01, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={coords.length}
            array={new Float32Array(coords.flatMap(([x, z]) => [x, z, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#94a3b8" linewidth={1} />
      </lineLoop>

      {(hovered || isSelected) && (
        <Html position={center} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div className="iso-label">{config.label}</div>
        </Html>
      )}

      {isSelected && (
        <Html position={center} center distanceFactor={12} style={{ pointerEvents: 'auto' }}>
          <IsoBubble placemark={placemark} label={config.label} color={config.color} onClose={() => onSelect(null)} />
        </Html>
      )}
    </group>
  );
}

// ─── Info Bubble ───
function IsoBubble({ placemark, label, color, onClose }: {
  placemark: KmlPlacemark; label: string; color: string; onClose: () => void;
}) {
  const info = getProjectInfo(placemark.name);
  return (
    <div className="iso-bubble" onClick={(e) => e.stopPropagation()}>
      <button className="iso-bubble-close" onClick={onClose}>×</button>
      <div className="iso-bubble-header" style={{ borderBottomColor: color }}>
        <span className="iso-bubble-badge" style={{ background: color, color: '#1e293b' }}>{placemark.category}</span>
        <h3 className="iso-bubble-title">{label}</h3>
      </div>
      <p className="iso-bubble-desc">{info.description}</p>
      <div className="iso-bubble-footer">
        <span className="iso-bubble-status" style={{ color }}>{info.status}</span>
        {info.link && (
          <a href={info.link} target="_blank" rel="noopener noreferrer" className="iso-bubble-cta">Découvrir</a>
        )}
      </div>
    </div>
  );
}

// ─── Perimeter Outline ───
function PerimeterOutline({ coords }: { coords: [number, number][] }) {
  const lineRef = useRef<THREE.Line>(null);

  useEffect(() => {
    if (!lineRef.current) return;
    const points = coords.map(([x, z]) => new THREE.Vector3(x, 0.05, z));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    lineRef.current.geometry = geometry;
    lineRef.current.computeLineDistances();
  }, [coords]);

  return (
    <primitive
      ref={lineRef}
      object={new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineDashedMaterial({ color: '#94a3b8', dashSize: 0.3, gapSize: 0.15, opacity: 0.5, transparent: true })
      )}
    />
  );
}

// ─── Pin Marker (clean minimal) ───
function PinMarker({ position, color, name, placemark, isSelected, onSelect }: {
  position: [number, number, number]; color: string; name: string;
  placemark: KmlPlacemark; isSelected: boolean; onSelect: (name: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.7, 6]} />
        <meshStandardMaterial color="#cbd5e1" flatShading />
      </mesh>
      <mesh
        position={[0, 0.75, 0]}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default'; }}
        onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : name); }}
      >
        <octahedronGeometry args={[0.1, 0]} />
        <meshStandardMaterial color={color} flatShading emissive={color} emissiveIntensity={hovered ? 0.3 : 0.1} />
      </mesh>

      {(hovered || isSelected) && (
        <Html position={[0, 1.1, 0]} center distanceFactor={15} style={{ pointerEvents: isSelected ? 'auto' : 'none' }}>
          {isSelected ? (
            <IsoBubble placemark={placemark} label={name} color={color} onClose={() => onSelect(null)} />
          ) : (
            <div className="iso-label">{name}</div>
          )}
        </Html>
      )}
    </group>
  );
}

// ─── Ground (white maquette base) ───
function GroundPlane() {
  return (
    <group>
      {/* Main base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.95} metalness={0} />
      </mesh>
      {/* Subtle base edge */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[52, 52]} />
        <meshStandardMaterial color="#e2e8f0" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

// ─── Main Component ───
const MasterplanScene3D = () => {
  const [placemarks, setPlacemarks] = useState<KmlPlacemark[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/map_ogd.kml')
      .then((r) => r.text())
      .then((text) => setPlacemarks(parseKml(text)));
  }, []);

  const handleSelect = useCallback((name: string | null) => setSelectedZone(name), []);
  const handleCanvasClick = useCallback(() => setSelectedZone(null), []);

  return (
    <div className="relative flex-1 w-full h-full" style={{ background: '#f8fafc' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={handleCanvasClick}
      >
        <OrthographicCamera makeDefault position={[15, 15, 15]} zoom={45} near={0.1} far={200} />
        <color attach="background" args={['#f8fafc']} />

        {/* Soft even lighting for maquette feel */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={0.8}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={50}
          shadow-camera-near={0.1}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
        />
        <directionalLight position={[-8, 12, -8]} intensity={0.3} color="#e0e7ff" />

        <GroundPlane />

        {/* Subtle grid */}
        <gridHelper args={[50, 50, '#cbd5e1', '#e2e8f0']} position={[0, 0.01, 0]} />

        {placemarks.map((pm) => {
          if (pm.type === 'polygon') {
            if (pm.name === 'Polygon 356') {
              return <PerimeterOutline key={pm.id} coords={coordsToXZ(pm.coordinates as [number, number][])} />;
            }
            const config = ZONE_CONFIG[pm.name];
            if (!config) return null;
            return (
              <ExtrudedZone
                key={pm.id}
                coords={coordsToXZ(pm.coordinates as [number, number][])}
                config={config}
                name={pm.name}
                placemark={pm}
                isSelected={selectedZone === pm.name}
                onSelect={handleSelect}
              />
            );
          }
          if (pm.type === 'point') {
            const [lat, lng] = pm.coordinates as [number, number];
            const [x, z] = latLngToXZ(lat, lng);
            return (
              <PinMarker
                key={pm.id}
                position={[x, 0, z]}
                color={MARKER_CONFIG[pm.name] || '#86efac'}
                name={pm.name}
                placemark={pm}
                isSelected={selectedZone === pm.name}
                onSelect={handleSelect}
              />
            );
          }
          return null;
        })}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minZoom={20}
          maxZoom={100}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 6}
          enablePan
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};

export default MasterplanScene3D;
