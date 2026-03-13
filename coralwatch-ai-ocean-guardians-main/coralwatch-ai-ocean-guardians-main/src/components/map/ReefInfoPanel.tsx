import React from 'react';
import { Button } from '@/components/ui/button';

interface CoralReef {
  name: string;
  coordinates: [number, number];
  country: string;
  status: string;
  description: string;
}

interface ReefInfoPanelProps {
  selectedReef: CoralReef | null;
  allReefs: CoralReef[];
  onReefSelect: (reef: CoralReef) => void;
}

const ReefInfoPanel: React.FC<ReefInfoPanelProps> = ({ selectedReef, allReefs, onReefSelect }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'Threatened':
        return 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
      case 'Vulnerable':
        return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      default:
        return 'bg-green-500/20 text-green-300 border border-green-500/30';
    }
  };

  return (
    <div className="glass-ocean p-6 rounded-xl h-[600px] overflow-y-auto">
      <h3 className="text-xl font-semibold text-white mb-4">Coral Reef Locations</h3>
      
      {selectedReef ? (
        <div className="text-white">
          <h4 className="text-lg font-bold text-accent mb-2">{selectedReef.name}</h4>
          <p className="text-sm text-white/80 mb-2">{selectedReef.country}</p>
          <p className="text-sm mb-4">{selectedReef.description}</p>
          <div className="mb-4">
            <span className={`inline-block px-3 py-1 text-sm rounded-full ${getStatusColor(selectedReef.status)}`}>
              Status: {selectedReef.status}
            </span>
          </div>
          <div className="mb-4 p-3 bg-white/10 rounded-lg border border-white/20">
            <h5 className="text-sm font-semibold text-accent mb-2">Coordinates</h5>
            <p className="text-xs text-white/80">
              Latitude: {selectedReef.coordinates[1].toFixed(4)}°<br />
              Longitude: {selectedReef.coordinates[0].toFixed(4)}°
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20 mb-4"
            onClick={() => onReefSelect(selectedReef)}
          >
            Center on Map
          </Button>
          <Button 
            variant="coral" 
            size="sm" 
            className="w-full"
          >
            Learn More
          </Button>
        </div>
      ) : (
        <div className="text-white/80">
          <p className="text-sm mb-4">
            Click on any coral reef marker on the map to view detailed information about that location.
          </p>
          <div className="space-y-2">
            {allReefs.map((reef, index) => (
              <div 
                key={index} 
                className="text-sm p-3 bg-white/10 rounded border border-white/20 cursor-pointer hover:bg-white/20 transition-colors"
                onClick={() => onReefSelect(reef)}
              >
                <div className="font-medium text-white">{reef.name}</div>
                <div className="text-xs text-white/70">{reef.country}</div>
                <div className="mt-1">
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(reef.status)}`}>
                    {reef.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReefInfoPanel;