import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOGLE_PLACES_API_KEY } from '../config';

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type MapViewType = {
  animateToRegion: (region: Region, duration?: number) => void;
};

export const PROVIDER_GOOGLE = 'google';

type MapViewProps = {
  provider?: string;
  style?: any;
  initialRegion?: Region | null;
  onPanDrag?: () => void;
  onRegionChangeComplete?: (region: Region) => void;
  onMapReady?: () => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
};

type GoogleMap = {
  setCenter: (center: { lat: number; lng: number }) => void;
  panTo: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getCenter: () => { lat: () => number; lng: () => number } | null;
  getZoom: () => number | null;
  addListener: (eventName: string, handler: () => void) => { remove: () => void };
};

type GoogleMapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
    event: { trigger: (instance: GoogleMap, eventName: string) => void };
  };
};

let mapsApiPromise: Promise<GoogleMapsApi> | null = null;

const loadGoogleMaps = (): Promise<GoogleMapsApi> => {
  if (window.google?.maps) return Promise.resolve(window.google);
  if (mapsApiPromise) return mapsApiPromise;

  const getLoadedGoogle = () => {
    if (!window.google?.maps) throw new Error('Google Maps API is unavailable');
    return window.google;
  };

  mapsApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-aasaan-google-maps]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        try {
          resolve(getLoadedGoogle());
        } catch (error) {
          reject(error);
        }
      });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Google Maps')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.dataset.aasaanGoogleMaps = 'true';
    script.onload = () => {
      try {
        resolve(getLoadedGoogle());
      } catch (error) {
        reject(error);
      }
    };
    script.onerror = () => reject(new Error('Unable to load Google Maps'));
    document.head.appendChild(script);
  });

  return mapsApiPromise;
};

const regionToZoom = (region: Region) => Math.max(3, Math.min(20, Math.round(Math.log2(360 / region.longitudeDelta))));

const zoomToRegion = (map: GoogleMap): Region | null => {
  const center = map.getCenter();
  const zoom = map.getZoom();
  if (!center || zoom == null) return null;
  const longitudeDelta = 360 / 2 ** zoom;
  return {
    latitude: center.lat(),
    longitude: center.lng(),
    latitudeDelta: longitudeDelta,
    longitudeDelta,
  };
};

declare global {
  interface Window {
    google?: GoogleMapsApi;
  }
}

const AppMapView = forwardRef<MapViewType, MapViewProps>((props, ref) => {
  const { initialRegion, onMapReady, onPanDrag, onRegionChangeComplete } = props;
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const regionCallbackRef = useRef(onRegionChangeComplete);
  const [error, setError] = useState(false);

  useEffect(() => {
    regionCallbackRef.current = onRegionChangeComplete;
  }, [onRegionChangeComplete]);

  useEffect(() => {
    let cancelled = false;
    if (!mapElementRef.current || !initialRegion) return undefined;

    void loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapElementRef.current || mapRef.current) return;
        const map = new google.maps.Map(mapElementRef.current, {
          center: { lat: initialRegion.latitude, lng: initialRegion.longitude },
          zoom: regionToZoom(initialRegion),
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        mapRef.current = map;
        map.addListener('dragstart', () => onPanDrag?.());
        map.addListener('idle', () => {
          const region = zoomToRegion(map);
          if (region) regionCallbackRef.current?.(region);
        });
        onMapReady?.();
      })
      .catch(() => setError(true));

    return () => {
      cancelled = true;
    };
  }, [initialRegion, onMapReady, onPanDrag]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialRegion) return;
    map.setCenter({ lat: initialRegion.latitude, lng: initialRegion.longitude });
    map.setZoom(regionToZoom(initialRegion));
  }, [initialRegion]);

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (region: Region) => {
        const map = mapRef.current;
        if (!map) return;
        map.panTo({ lat: region.latitude, lng: region.longitude });
        map.setZoom(regionToZoom(region));
      },
    }),
    []
  );

  return (
    <View style={props.style}>
      <div ref={mapElementRef} style={styles.mapElement as React.CSSProperties} />
      {error && <View style={styles.errorOverlay} />}
    </View>
  );
});

const styles = StyleSheet.create({
  mapElement: {
    width: '100%',
    height: '100%',
  } as any,
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#e8ecef',
  },
});

export default AppMapView;
