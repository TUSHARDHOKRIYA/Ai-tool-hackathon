'use client';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllReefs, type Reef } from '@/lib/db';
import { scoreToColor } from '@/lib/constants';
import { SeverityBadge } from '@/components/SeverityBadge';
import type { BleachStage } from '@/lib/constants';

// We use Leaflet directly via window.L to avoid TypeScript prop type issues
// with react-leaflet v4 and @types/leaflet version mismatches.
// The CSS is loaded dynamically so we do not need a static import.

interface ReefHeatmapProps {
    height?: string;
    onReefClick?: (reef: Reef) => void;
}

export function ReefHeatmap({ height = '500px', onReefClick }: ReefHeatmapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<any>(null);
    const [reefs, setReefs] = useState<Reef[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Load data
    useEffect(() => {
        getAllReefs().then((data) => {
            setReefs(data);
            setLoading(false);
        });
    }, []);

    // Init Leaflet after data loads
    useEffect(() => {
        if (loading || !mapRef.current) return;

        // Load Leaflet CSS if not already present
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        // Load Leaflet JS dynamically
        const initMap = () => {
            const L = (window as any).L;
            if (!L || !mapRef.current) return;

            // Destroy existing map if re-rendering
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
            }

            const avgLat = reefs.length > 0
                ? reefs.reduce((s, r) => s + (r.lat ?? 0), 0) / reefs.length
                : 0;
            const avgLon = reefs.length > 0
                ? reefs.reduce((s, r) => s + (r.lon ?? 0), 0) / reefs.length
                : 120;

            const map = L.map(mapRef.current).setView([avgLat || 0, avgLon || 120], reefs.length > 0 ? 5 : 2);
            leafletMapRef.current = map;

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors',
            }).addTo(map);

            reefs.forEach((reef) => {
                if (reef.lat == null || reef.lon == null) return;
                const score = reef.latest_health_score ?? 50;
                const color = scoreToColor(score);

                const circle = L.circleMarker([reef.lat, reef.lon], {
                    radius: 18,
                    fillColor: color,
                    fillOpacity: 0.85,
                    color: '#fff',
                    weight: 2,
                });

                circle.bindPopup(`
          <div style="min-width:160px">
            <p style="font-weight:600;font-size:13px;margin-bottom:6px">${reef.reef_name}</p>
            <p style="font-size:12px;color:#555">Health Score: <strong style="color:${color}">${score}</strong></p>
            <p style="font-size:11px;color:#777">${reef.latest_bleach_stage ?? 'Healthy'}</p>
            <a href="/reef/${reef.reef_id}" style="font-size:11px;color:#3b82f6;text-decoration:underline">
              View detail →
            </a>
          </div>
        `);

                circle.addTo(map);

                circle.on('click', () => {
                    if (onReefClick) onReefClick(reef);
                });
            });
        };

        if ((window as any).L) {
            initMap();
        } else {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = initMap;
            document.head.appendChild(script);
        }

        return () => {
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
            }
        };
    }, [loading, reefs, navigate, onReefClick]);

    if (loading) {
        return (
            <div
                className="flex items-center justify-center rounded-xl bg-muted animate-pulse"
                style={{ height }}
            >
                <p className="text-muted-foreground text-sm">Loading reef data…</p>
            </div>
        );
    }

    if (reefs.length === 0) {
        return (
            <div
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-muted-foreground/20"
                style={{ height }}
            >
                <span className="text-4xl">🌊</span>
                <p className="text-muted-foreground text-sm text-center px-4">
                    No reef data yet. Upload coral images with GPS to populate the map.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-xl overflow-hidden border shadow-lg" style={{ height }}>
            <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        </div>
    );
}
