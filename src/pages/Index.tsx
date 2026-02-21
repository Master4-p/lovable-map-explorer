import { useState, lazy, Suspense } from 'react';
import MapHeader from '@/components/MapHeader';
import InteractiveMap from '@/components/InteractiveMap';

const Map3DView = lazy(() => import('@/components/Map3DView'));

const Index = () => {
  const [is3D, setIs3D] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <MapHeader is3D={is3D} onToggle={() => setIs3D(!is3D)} />
      {is3D ? (
        <Suspense
          fallback={
            <div className="flex-1 flex items-center justify-center bg-[#0a1628]">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Chargement de la vue 3D…</p>
              </div>
            </div>
          }
        >
          <div className="flex-1 w-full">
            <Map3DView />
          </div>
        </Suspense>
      ) : (
        <InteractiveMap />
      )}
    </div>
  );
};

export default Index;
