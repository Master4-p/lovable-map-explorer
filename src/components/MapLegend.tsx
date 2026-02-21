import { useState } from 'react';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

interface CategoryConfig {
  name: string;
  color: string;
  count: number;
  visible: boolean;
}

interface MapLegendProps {
  categories: CategoryConfig[];
  onToggle: (categoryName: string) => void;
}

const MapLegend = ({ categories, onToggle }: MapLegendProps) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="absolute top-4 right-4 z-[1000] w-56">
      <div className="bg-card rounded-lg shadow-[var(--shadow-card)] border border-border overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <span className="flex items-center gap-2 font-medium text-sm">
            <Layers className="w-4 h-4" />
            Légende
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="p-2">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => onToggle(cat.name)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all hover:bg-secondary ${
                  cat.visible ? 'opacity-100' : 'opacity-40'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-border"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-foreground flex-1 text-left">{cat.name}</span>
                <span className="text-muted-foreground text-xs">{cat.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MapLegend;
