import { useRef, useEffect, useState } from 'react';
import Globe from 'react-globe.gl';
import { getCountryCoordinates } from '@/lib/countryData';
import { isWebGLAvailable } from '@/lib/webgl-check';

export interface DonationArc {
  id: string;
  fromCountry: string;
  toCountry: string;
  amount?: number;
  createdAt: string;
}

interface GlobeArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  label?: string;
}

interface DonationGlobeProps {
  donations: DonationArc[];
  width?: number;
  height?: number;
}

export default function DonationGlobe({ donations, width = 800, height = 600 }: DonationGlobeProps) {
  const globeEl = useRef<any>(null);
  const [arcsData, setArcsData] = useState<GlobeArcData[]>([]);
  const [globeReady, setGlobeReady] = useState(false);
  const [webGLSupported] = useState(() => isWebGLAvailable());

  useEffect(() => {
    if (!globeEl.current || !webGLSupported) return;

    // Configure auto-rotation
    globeEl.current.controls().autoRotate = true;
    globeEl.current.controls().autoRotateSpeed = 0.5;
    globeEl.current.controls().enableZoom = true;

    // Set initial point of view
    globeEl.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1000);
  }, [globeReady, webGLSupported]);

  useEffect(() => {
    const arcs: GlobeArcData[] = [];

    donations.forEach((donation) => {
      const fromCoords = getCountryCoordinates(donation.fromCountry);
      const toCoords = getCountryCoordinates(donation.toCountry);

      if (fromCoords && toCoords) {
        arcs.push({
          startLat: fromCoords.lat,
          startLng: fromCoords.lng,
          endLat: toCoords.lat,
          endLng: toCoords.lng,
          color: '#10b981',
          label: `${donation.fromCountry} → ${donation.toCountry}`,
        });
      }
    });

    setArcsData(arcs);
  }, [donations]);

  // Check WebGL support before attempting to render Globe
  if (!webGLSupported) {
    console.log('WebGL not available, showing fallback UI');
    return (
      <div 
        className="flex items-center justify-center bg-card rounded-lg border"
        style={{ width, height }}
        data-testid="globe-error"
      >
        <div className="text-center text-muted-foreground p-6">
          <p className="font-medium">3D Globe Visualization Unavailable</p>
          <p className="text-sm mt-2">
            WebGL is not supported in your browser or environment.
          </p>
          <p className="text-sm mt-1">
            Your donations are making a global impact across {donations.length} locations!
          </p>
        </div>
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-card rounded-lg border"
        style={{ width, height }}
        data-testid="globe-placeholder"
      >
        <div className="text-center text-muted-foreground">
          <p>No donations to display yet</p>
          <p className="text-sm mt-2">Start donating to see your global impact!</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg overflow-hidden border bg-card"
      data-testid="donation-globe"
    >
      <Globe
        ref={globeEl}
        width={width}
        height={height}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        arcsData={arcsData}
        arcStartLat={(d: any) => d.startLat}
        arcStartLng={(d: any) => d.startLng}
        arcEndLat={(d: any) => d.endLat}
        arcEndLng={(d: any) => d.endLng}
        arcColor={(d: any) => d.color}
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={1500}
        arcStroke={0.5}
        arcsTransitionDuration={1000}
        arcLabel={(d: any) => d.label || ''}
        onGlobeReady={() => setGlobeReady(true)}
      />
    </div>
  );
}
