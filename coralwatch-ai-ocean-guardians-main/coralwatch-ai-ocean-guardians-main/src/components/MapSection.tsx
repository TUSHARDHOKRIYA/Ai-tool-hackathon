import React from 'react';

const alertLevels = [
  {
    color: 'bg-sky-200',
    label: 'No Stress',
    dhw: '0 DHW',
    description: 'Normal sea surface temperatures. Coral reefs are in their comfort zone.',
  },
  {
    color: 'bg-yellow-400',
    label: 'Bleaching Watch',
    dhw: '0–4 DHW',
    description: 'Temperatures are elevated. Corals begin to show early stress signs.',
  },
  {
    color: 'bg-orange-500',
    label: 'Bleaching Warning',
    dhw: '4–8 DHW',
    description: 'Significant heat accumulation. Widespread bleaching is likely within weeks.',
  },
  {
    color: 'bg-red-600',
    label: 'Bleaching Alert Level 1',
    dhw: '8–12 DHW',
    description: 'Severe thermal stress. Mass bleaching and some coral mortality expected.',
  },
  {
    color: 'bg-red-900',
    label: 'Bleaching Alert Level 2',
    dhw: '≥ 12 DHW',
    description: 'Extreme, prolonged heat stress. Widespread mortality is highly probable.',
  },
];

const MapSection = () => {
  return (
    <section id="map" className="py-20 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Coral Bleaching Heat Stress Map
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Monitor real-time ocean heat stress levels worldwide. Degree Heating Weeks (DHW) measure accumulated thermal stress &mdash; the primary driver of coral bleaching events.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Map image */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-muted/40">
              <img
                src="/heat_map.png"
                alt="NOAA Coral Bleaching Heat Stress Map showing global Degree Heating Weeks"
                className="w-full h-auto object-cover"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Source: NOAA Coral Reef Watch — Satellite-derived sea surface temperature anomaly data
            </p>
          </div>

          {/* Legend panel */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-muted/40 bg-card/80 backdrop-blur-sm shadow-lg p-6 space-y-5">
              <h3 className="text-lg font-semibold text-foreground">
                Bleaching Alert Levels
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                <strong>Degree Heating Weeks (DHW)</strong> quantify the duration and intensity of thermal stress on coral. Higher DHW values correlate with greater bleaching severity and mortality risk.
              </p>

              <div className="space-y-3">
                {alertLevels.map((level) => (
                  <div
                    key={level.label}
                    className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-muted/40"
                  >
                    <span
                      className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-sm ${level.color}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {level.label}{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          ({level.dhw})
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {level.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                  <strong>Why it matters:</strong> When DHW exceeds 4, bleaching becomes likely. Above 8 DHW, significant mortality occurs. Monitoring these values helps conservationists prioritise intervention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;