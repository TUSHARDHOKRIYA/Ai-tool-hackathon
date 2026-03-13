import React, { useState } from 'react';
import MapContainer from './map/MapContainer';
import ReefInfoPanel from './map/ReefInfoPanel';

// Coral reef locations around the world
const coralReefs = [
  {
    name: "Great Barrier Reef",
    coordinates: [145.7781, -16.2839] as [number, number],
    country: "Australia",
    status: "Vulnerable",
    description: "The world's largest coral reef system"
  },
  {
    name: "Mesoamerican Reef",
    coordinates: [-87.5, 18.0] as [number, number],
    country: "Caribbean",
    status: "Threatened",
    description: "Second largest barrier reef in the world"
  },
  {
    name: "Coral Triangle",
    coordinates: [120.0, -2.0] as [number, number],
    country: "Southeast Asia",
    status: "Critical",
    description: "Marine biodiversity hotspot"
  },
  {
    name: "Red Sea Coral Reef",
    coordinates: [38.0, 20.0] as [number, number],
    country: "Red Sea",
    status: "Stable",
    description: "Remarkably resilient coral ecosystem"
  },
  {
    name: "New Caledonia Barrier Reef",
    coordinates: [165.0, -21.0] as [number, number],
    country: "New Caledonia",
    status: "Protected",
    description: "UNESCO World Heritage site"
  },
  {
    name: "Florida Keys Reef",
    coordinates: [-80.5, 24.7] as [number, number],
    country: "USA",
    status: "Recovering",
    description: "Third largest barrier reef system"
  }
];

const MapSection = () => {
  const [selectedReef, setSelectedReef] = useState<typeof coralReefs[0] | null>(null);

  const handleReefSelect = (reef: typeof coralReefs[0]) => {
    console.log('Reef selected:', reef.name);
    setSelectedReef(reef);
  };

  return (
    <section id="map" className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Global Coral Reef Map
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Explore coral reef locations worldwide and monitor their conservation status through our interactive Google Maps.
          </p>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Map */}
          <div className="lg:col-span-3">
            <MapContainer 
              coralReefs={coralReefs}
              onReefSelect={handleReefSelect}
              selectedReef={selectedReef}
            />
          </div>

          {/* Reef Information Panel */}
          <div className="lg:col-span-1">
            <ReefInfoPanel 
              selectedReef={selectedReef}
              allReefs={coralReefs}
              onReefSelect={handleReefSelect}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;