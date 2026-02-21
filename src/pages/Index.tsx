import MapHeader from '@/components/MapHeader';
import InteractiveMap from '@/components/InteractiveMap';

const Index = () => {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <MapHeader />
      <InteractiveMap />
    </div>
  );
};

export default Index;
