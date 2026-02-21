import { MapPin, Box, Map } from 'lucide-react';

interface MapHeaderProps {
  is3D: boolean;
  onToggle: () => void;
}

const MapHeader = ({ is3D, onToggle }: MapHeaderProps) => {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between shadow-sm z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <MapPin className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
            Songon Masterplan
          </h1>
          <p className="text-xs text-muted-foreground">Carte interactive du projet</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border border-border bg-secondary hover:bg-accent hover:text-accent-foreground"
        >
          {is3D ? (
            <>
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Vue 2D</span>
            </>
          ) : (
            <>
              <Box className="w-4 h-4" />
              <span className="hidden sm:inline">Vue 3D</span>
            </>
          )}
        </button>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 bg-secondary rounded-md">Côte d'Ivoire</span>
        </div>
      </div>
    </header>
  );
};

export default MapHeader;
