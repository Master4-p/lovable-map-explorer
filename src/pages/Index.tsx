import { useState, lazy, Suspense } from 'react';
import MapHeader from '@/components/MapHeader';
import InteractiveMap from '@/components/InteractiveMap';

const MasterplanScene3D = lazy(() => import('@/components/MasterplanScene3D'));

const Index = () => {
  const [is3D, setIs3D] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <MapHeader />
      <div className="relative flex-1">
        {is3D ? (
          <Suspense fallback={
            <div className="flex-1 w-full h-full flex items-center justify-center" style={{ background: '#0a1a0f' }}>
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Chargement du modèle 3D…</p>
              </div>
            </div>
          }>
            <MasterplanScene3D />
          </Suspense>
        ) : (
          <InteractiveMap />
        )}

        {/* 2D / 3D Toggle */}
        <button
          onClick={() => setIs3D(!is3D)}
          className="view-toggle-btn"
          title={is3D ? 'Vue aérienne 2D' : 'Vue maquette 3D'}
        >
          {is3D ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
              <path d="M12 12l8-4.5" />
              <path d="M12 12v9" />
              <path d="M12 12L4 7.5" />
            </svg>
          )}
          <span>{is3D ? '2D' : '3D'}</span>
        </button>
      </div>
    </div>
  );
};

export default Index;
