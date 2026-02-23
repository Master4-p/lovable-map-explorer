import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { parseKml, KmlPlacemark } from '@/lib/kmlParser';
import { getProjectInfo } from '@/lib/projectData';
import { coordsToXZ, latLngToXZ } from '@/lib/geoProjection';

// Zone extrusion heights and colors
const ZONE_CONFIG: Record<string, { color: string; height: number; label: string }> = {
  'Polygon 323': { color: '#10b981', height: 1.8, label: 'Songon Extension' },
  'Polygon 2FD': { color: '#ef4444', height: 1.2, label: 'Zone Résidentielle A' },
  'Polygon 2E6': { color: '#8b5cf6', height: 1.0, label: 'Marina' },
  'Polygon 1D4': { color: '#22c55e', height: 1.4, label: 'Songon East-Side' },
  'Polygon 1D2': { color: '#f97316', height: 1.1, label: 'Zone Résidentielle B' },
};

const MARKER_CONFIG: Record<string, string> = {
  'PROJET MARINA': '#8b5cf6',
  'Songon East-Side': '#22c55e',
  'Terre de Songon': '#f97316',
  'Songon Extension': '#10b981',
  'Le Golf de Songon': '#3b82f6',
};

// ─── Extruded Zone Component ───
function ExtrudedZone({
  coords,
  config,
  name,
  placemark,
  isSelected,
  onSelect,
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

  const extrudeSettings = useMemo(
    () => ({
      depth: config.height,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 2,
    }),
    [config.height]
  );

  const color = useMemo(() => new THREE.Color(config.color), [config.color]);
  const hoverColor = useMemo(() => new THREE.Color(config.color).multiplyScalar(1.3), [config.color]);

  // Compute center for label
  const center = useMemo(() => {
    const cx = coords.reduce((s, [x]) => s + x, 0) / coords.length;
    const cz = coords.reduce((s, [, z]) => s + z, 0) / coords.length;
    return [cx, config.height + 0.3, cz] as [number, number, number];
  }, [coords, config.height]);

  useFrame(() => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    const targetColor = hovered || isSelected ? hoverColor : color;
    mat.color.lerp(targetColor, 0.1);
    mat.opacity = THREE.MathUtils.lerp(mat.opacity, hovered || isSelected ? 0.85 : 0.65, 0.1);
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(isSelected ? null : name);
        }}
        castShadow
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.65}
          roughness={0.4}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Zone edge outline */}
      <lineLoop rotation={[-Math.PI / 2, 0, 0]} position={[0, config.height + 0.01, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={coords.length}
            array={new Float32Array(coords.flatMap(([x, z]) => [x, z, 0]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={config.color} linewidth={2} transparent opacity={0.8} />
      </lineLoop>

      {/* Hover/selected label */}
      {(hovered || isSelected) && (
        <Html position={center} center distanceFactor={15} style={{ pointerEvents: 'none' }}>
          <div className="zone-3d-label">
            {config.label}
          </div>
        </Html>
      )}

      {/* Info bubble on select */}
      {isSelected && (
        <Html position={center} center distanceFactor={12} style={{ pointerEvents: 'auto' }}>
          <InfoBubble3D placemark={placemark} label={config.label} color={config.color} onClose={() => onSelect(null)} />
        </Html>
      )}
    </group>
  );
}

// ─── 3D Info Bubble ───
function InfoBubble3D({
  placemark,
  label,
  color,
  onClose,
}: {
  placemark: KmlPlacemark;
  label: string;
  color: string;
  onClose: () => void;
}) {
  const info = getProjectInfo(placemark.name);

  return (
    <div className="bubble-3d" onClick={(e) => e.stopPropagation()}>
      <button className="bubble-3d-close" onClick={onClose}>×</button>
      <div className="bubble-3d-header" style={{ borderBottomColor: color }}>
        <span className="bubble-3d-badge" style={{ background: color }}>{placemark.category}</span>
        <h3 className="bubble-3d-title">{label}</h3>
      </div>
      <p className="bubble-3d-desc">{info.description}</p>
      <div className="bubble-3d-footer">
        <span className="bubble-3d-status" style={{ color }}>{info.status}</span>
        {info.link && (
          <a href={info.link} target="_blank" rel="noopener noreferrer" className="bubble-3d-cta">
            Découvrir
          </a>
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
        new THREE.LineDashedMaterial({ color: '#10b981', dashSize: 0.3, gapSize: 0.15, opacity: 0.6, transparent: true })
      )}
    />
  );
}

// ─── Pin Marker ───
function PinMarker({
  position,
  color,
  name,
  placemark,
  isSelected,
  onSelect,
}: {
  position: [number, number, number];
  color: string;
  name: string;
  placemark: KmlPlacemark;
  isSelected: boolean;
  onSelect: (name: string | null) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <group position={position}>
      {/* Pin pole */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
        <meshStandardMaterial color="#ffffff" opacity={0.7} transparent />
      </mesh>
      {/* Pin head */}
      <mesh
        position={[0, 0.85, 0]}
        onPointerEnter={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerLeave={() => {
          setHovered(false);
          document.body.style.cursor = 'default';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(isSelected ? null : name);
        }}
      >
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={hovered ? 0.5 : 0.2} />
      </mesh>

      {(hovered || isSelected) && (
        <Html position={[0, 1.2, 0]} center distanceFactor={15} style={{ pointerEvents: isSelected ? 'auto' : 'none' }}>
          {isSelected ? (
            <InfoBubble3D placemark={placemark} label={name} color={color} onClose={() => onSelect(null)} />
          ) : (
            <div className="zone-3d-label">{name}</div>
          )}
        </Html>
      )}
    </group>
  );
}

// ─── Ground Plane ───
function GroundPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#1a2f22" roughness={0.9} metalness={0} />
    </mesh>
  );
}

// ─── Scene Setup ───
function SceneSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(8, 12, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return null;
}

// ─── Main 3D Component ───
const MasterplanScene3D = () => {
  const [placemarks, setPlacemarks] = useState<KmlPlacemark[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/map_ogd.kml')
      .then((r) => r.text())
      .then((text) => {
        setPlacemarks(parseKml(text));
      });
  }, []);

  const handleSelect = useCallback((name: string | null) => {
    setSelectedZone(name);
  }, []);

  // Click on empty space to deselect
  const handleCanvasClick = useCallback(() => {
    setSelectedZone(null);
  }, []);

  return (
    <div className="relative flex-1 w-full h-full" style={{ background: '#0a1a0f' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: false }}
        onPointerMissed={handleCanvasClick}
      >
        <SceneSetup />
        <color attach="background" args={['#0a1a0f']} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 5]}
          intensity={1.2}
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
        <directionalLight position={[-5, 8, -10]} intensity={0.3} color="#10b981" />

        {/* Ground */}
        <GroundPlane />
        <ContactShadows position={[0, 0, 0]} opacity={0.3} scale={50} blur={2} far={15} />

        {/* Grid helper for architectural feel */}
        <gridHelper args={[60, 60, '#1e3a2a', '#152820']} position={[0, 0.01, 0]} />

        {/* Render zones */}
        {placemarks.map((pm) => {
          if (pm.type === 'polygon') {
            if (pm.name === 'Polygon 356') {
              const projCoords = coordsToXZ(pm.coordinates as [number, number][]);
              return <PerimeterOutline key={pm.id} coords={projCoords} />;
            }

            const config = ZONE_CONFIG[pm.name];
            if (!config) return null;

            const projCoords = coordsToXZ(pm.coordinates as [number, number][]);
            return (
              <ExtrudedZone
                key={pm.id}
                coords={projCoords}
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
            const color = MARKER_CONFIG[pm.name] || '#10b981';

            return (
              <PinMarker
                key={pm.id}
                position={[x, 0, z]}
                color={color}
                name={pm.name}
                placemark={pm}
                isSelected={selectedZone === pm.name}
                onSelect={handleSelect}
              />
            );
          }

          return null;
        })}

        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 6}
          enablePan={false}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};

export default MasterplanScene3D;
