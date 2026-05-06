import React, { useEffect, useRef } from 'react';
import Map, { Marker, Source, Layer, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

const STORE_LOCATION = { lat: 19.007799701306315, lng: 73.1133276380079 };

interface LocationMapProps {
  userLoc: { lat: number, lng: number } | null;
  onLocationSelect: (lat: number, lng: number) => void;
}

// Generate a GeoJSON Polygon for the 5km radius circle
function createGeoJSONCircle(center: [number, number], radiusInKm: number, points = 64) {
  const coords = [];
  const distanceX = radiusInKm / (111.320 * Math.cos(center[1] * Math.PI / 180));
  const distanceY = radiusInKm / 110.574;

  for(let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([center[0] + x, center[1] + y]);
  }
  coords.push(coords[0]); // close the polygon

  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [coords]
      }
    }]
  };
}

export default function LocationMap({ userLoc, onLocationSelect }: LocationMapProps) {
  const mapRef = useRef<MapRef>(null);

  // When userLoc changes from the parent (e.g., via search), fly to it
  useEffect(() => {
    if (userLoc && mapRef.current) {
      mapRef.current.flyTo({ center: [userLoc.lng, userLoc.lat], zoom: 14, duration: 1000 });
    }
  }, [userLoc]);

  const onMarkerDragEnd = (event: any) => {
    const lngLat = event.lngLat;
    onLocationSelect(lngLat.lat, lngLat.lng);
  };

  const handleMapClick = (event: any) => {
    const lngLat = event.lngLat;
    onLocationSelect(lngLat.lat, lngLat.lng);
  };

  const apiKey = process.env.NEXT_PUBLIC_OLA_MAPS_API_KEY || '';
  const mapStyleUrl = `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${apiKey}`;

  // Use a fallback UI if API key is missing so we don't crash
  if (!apiKey) {
    return (
      <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem', border: '1px solid var(--border)', background: 'var(--card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>Ola Maps API Key missing.</p>
      </div>
    );
  }

  const radiusGeoJSON = React.useMemo(() => 
    createGeoJSONCircle([STORE_LOCATION.lng, STORE_LOCATION.lat], 5),
  []);

  const transformRequest = React.useCallback((url: string, resourceType?: any) => {
    if (url.includes('api.olamaps.io') && !url.includes('api_key=')) {
      const separator = url.includes('?') ? '&' : '?';
      return { url: `${url}${separator}api_key=${apiKey}` };
    }
    return { url };
  }, [apiKey]);

  return (
    <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem', border: '1px solid var(--border)', zIndex: 10, flexShrink: 0 }}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: userLoc?.lng || STORE_LOCATION.lng,
          latitude: userLoc?.lat || STORE_LOCATION.lat,
          zoom: userLoc ? 14 : 12
        }}
        mapStyle={mapStyleUrl}
        style={{ width: '100%', height: '100%' }}
        onClick={handleMapClick}
        transformRequest={transformRequest}
      >
        {/* 5km Radius Circle Layer */}
        <Source id="radius-source" type="geojson" data={radiusGeoJSON}>
          <Layer 
            id="radius-layer" 
            type="fill" 
            paint={{ 'fill-color': '#f97316', 'fill-opacity': 0.1 }} 
          />
          <Layer 
            id="radius-outline-layer" 
            type="line" 
            paint={{ 'line-color': '#f97316', 'line-width': 2 }} 
          />
        </Source>

        {/* Store Location Pin */}
        <Marker longitude={STORE_LOCATION.lng} latitude={STORE_LOCATION.lat} anchor="bottom">
          <div style={{ backgroundColor: 'red', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white', boxShadow: '0 0 4px rgba(0,0,0,0.5)' }} />
        </Marker>

        {/* Draggable User Pin */}
        {userLoc && (
          <Marker 
            longitude={userLoc.lng} 
            latitude={userLoc.lat} 
            draggable={true} 
            onDragEnd={onMarkerDragEnd}
            anchor="bottom"
          >
            <div style={{ cursor: 'grab' }}>
              <svg viewBox="0 0 24 24" width="36" height="36" stroke="white" strokeWidth="2" fill="#ef4444" style={{ filter: 'drop-shadow(0px 4px 4px rgba(0,0,0,0.4))' }}>
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="3" fill="white" stroke="none" />
              </svg>
            </div>
          </Marker>
        )}
      </Map>
    </div>
  );
}
