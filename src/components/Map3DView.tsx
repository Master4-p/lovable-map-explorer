import { useEffect, useState, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { parseKml, KmlPlacemark } from '@/lib/kmlParser';

const LOT_COLORS: Record<string, string> = {
  'One Green Dev': '#1e88e5',
  'Songon East-Side': '#43a047',
  'Polygon 2FD': '#e53935',
  'Polygon 2E6': '#8e24aa',
  'Polygon 1D2': '#f4511e',
  'Polygon 165': '#00acc1',
  'Polygon 14F': '#ffb300',
  'Polygon 13C': '#d81b60',
  'Polygon 11E': '#3949ab',
  'Polygon 105': '#00897b',
  'Polygon F3': '#7cb342',
  'Polygon DA': '#6d4c41',
  'Polygon B3': '#c0ca33',
  'Polygon 99': '#5e35b1',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Résidentiel': '#2a7d5f',
  'Marina': '#1a6b8a',
  'Golf': '#4a8c3f',
  'Parcelles': '#c67a3e',
  'Infrastructure': '#7a5c8e',
  'Terrain': '#8a6d3b',
  'Autre': '#6b7280',
};

function getLotColor(name: string, category: string): string {
  return LOT_COLORS[name] || CATEGORY_COLORS[category] || '#6b7280';
}

// Convert lat/lng to local 3D coordinates relative to center
function latLngToLocal(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  scale: number
): [number, number] {
  const x = (lng - centerLng) * scale * Math.cos((centerLat * Math.PI) / 180);
  const z = -(lat - centerLat) * scale;
  return [x, z];
}

interface ExtrudedLotProps {
  coords: [number, number][];
  color: string;
  name: string;
  height: number;
  centerLat: number;
  centerLng: number;
  scale: number;
}

const ExtrudedLot = ({ coords, color, name, height, centerLat, centerLng, scale }: ExtrudedLotProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const localCoords = coords.map(([lat, lng]) => latLngToLocal(lat, lng, centerLat, centerLng, scale));
    
    if (localCoords.length < 3) return null;
    
    s.moveTo(localCoords[0][0], localCoords[0][1]);
    for (let i = 1; i < localCoords.length; i++) {
      s.lineTo(localCoords[i][0], localCoords[i][1]);
    }
    s.closePath();
    return s;
  }, [coords, centerLat, centerLng, scale]);

  const center = useMemo(() => {
    const localCoords = coords.map(([lat, lng]) => latLngToLocal(lat, lng, centerLat, centerLng, scale));
    const cx = localCoords.reduce((s, c) => s + c[0], 0) / localCoords.length;
    const cz = localCoords.reduce((s, c) => s + c[1], 0) / localCoords.length;
    return [cx, cz] as [number, number];
  }, [coords, centerLat, centerLng, scale]);

  useFrame(() => {
    if (meshRef.current) {
      const targetY = hovered ? height * 1.5 : height;
      const currentScale = meshRef.current.scale.y;
      meshRef.current.scale.y = THREE.MathUtils.lerp(currentScale, targetY / height, 0.1);
    }
  });

  if (!shape) return null;

  const extrudeSettings = { depth: height, bevelEnabled: false };

  return (
    <group>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshPhongMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={hovered ? 0.95 : 0.85}
          shininess={30}
        />
      </mesh>
      {/* Wireframe edges */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.3} />
      </mesh>
      {/* Label */}
      <Text
        position={[center[0], height + 0.3, center[1]]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {name}
      </Text>
    </group>
  );
};

const GroundPlane = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
    <planeGeometry args={[80, 80]} />
    <meshBasicMaterial color="#1a2e1f" />
  </mesh>
);

const GridHelper = () => (
  <gridHelper args={[80, 80, '#2a4a35', '#1e3828']} position={[0, -0.04, 0]} />
);

const CameraSetup = () => {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(5, 15, 12);
    camera.lookAt(0, 0, 0);
  }, [camera]);
  return null;
};

const Map3DView = () => {
  const [placemarks, setPlacemarks] = useState<KmlPlacemark[]>([]);

  useEffect(() => {
    fetch('/data/map_ogd.kml')
      .then((r) => r.text())
      .then((text) => setPlacemarks(parseKml(text)));
  }, []);

  const polygons = placemarks.filter((pm) => pm.type === 'polygon');

  // Calculate center from all polygon coordinates
  const { centerLat, centerLng } = useMemo(() => {
    let totalLat = 0, totalLng = 0, count = 0;
    polygons.forEach((pm) => {
      const coords = pm.coordinates as [number, number][];
      coords.forEach(([lat, lng]) => {
        totalLat += lat;
        totalLng += lng;
        count++;
      });
    });
    return {
      centerLat: count > 0 ? totalLat / count : 5.33,
      centerLng: count > 0 ? totalLng / count : -4.27,
    };
  }, [polygons]);

  const scale = 1500; // Scale factor for lat/lng to 3D units

  // Assign heights based on category
  const getHeight = (category: string): number => {
    switch (category) {
      case 'Résidentiel': return 2.5;
      case 'Marina': return 1.8;
      case 'Golf': return 0.8;
      case 'Parcelles': return 1.5;
      case 'Infrastructure': return 0.6;
      default: return 1.0;
    }
  };

  return (
    <div className="w-full h-full bg-[#1a2e1f]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault fov={45} near={0.1} far={500} />
        <CameraSetup />
        
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
        <directionalLight position={[-8, 10, -8]} intensity={0.3} />

        <color attach="background" args={['#1a2e1f']} />
        <fog attach="fog" args={['#1a2e1f', 40, 120]} />
        <GroundPlane />
        <GridHelper />

        {polygons.map((pm) => (
          <ExtrudedLot
            key={pm.id}
            coords={pm.coordinates as [number, number][]}
            color={getLotColor(pm.name, pm.category)}
            name={pm.name}
            height={getHeight(pm.category)}
            centerLat={centerLat}
            centerLng={centerLng}
            scale={scale}
          />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={50}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />
      </Canvas>
    </div>
  );
};

export default Map3DView;
