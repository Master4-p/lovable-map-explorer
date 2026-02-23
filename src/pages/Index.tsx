import MapHeader from '@/components/MapHeader';
import InteractiveMap from '@/components/InteractiveMap';

const Index = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <MapHeader />
      <div className="relative flex-1">
        <InteractiveMap />
      </div>
    </div>
  );
};

export default Index;
