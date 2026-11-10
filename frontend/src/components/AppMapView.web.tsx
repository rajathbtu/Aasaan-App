import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GOOGLE_PLACES_API_KEY } from '../config';
import { DARK_MAP_STYLE, type BasePalette } from '../theme/palette';
import { useTheme } from '../contexts/ThemeContext';

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
  mapType?: 'standard' | 'satellite';
  serviceArea?: {
    center: { latitude: number; longitude: number };
    radius: number;
  };
  onPanDrag?: () => void;
  onRegionChangeComplete?: (region: Region) => void;
  onMapReady?: () => void;
  /** Mirrors react-native-maps' press event so the same handler works on web. */
  onPress?: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
};

type GoogleMap = {
  setCenter: (center: { lat: number; lng: number }) => void;
  panTo: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setMapTypeId: (mapTypeId: string) => void;
  setOptions: (options: Record<string, unknown>) => void;
  getCenter: () => { lat: () => number; lng: () => number } | null;
  getZoom: () => number | null;
  addListener: (eventName: string, handler: (event?: any) => void) => { remove: () => void };
};

type GoogleCircle = {
  setMap: (map: GoogleMap | null) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  setRadius: (radius: number) => void;
};

type GoogleMapsApi = {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap;
    Circle: new (options: Record<string, unknown>) => GoogleCircle;
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
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-aasaanly-google-maps]');
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
    script.dataset.aasaanlyGoogleMaps = 'true';
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
  const { initialRegion, serviceArea, onMapReady, onPanDrag, onRegionChangeComplete, onPress, mapType } = props;
  const { base: C, isDark } = useTheme();
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const circleRef = useRef<GoogleCircle | null>(null);
  const regionCallbackRef = useRef(onRegionChangeComplete);
  const pressCallbackRef = useRef(onPress);
  /* The map is created once, so live values reach the constructor through a
     ref (same pattern as the callback refs above) instead of re-running the
     effect and rebuilding the map on every mode change. */
  const isDarkRef = useRef(isDark);
  const [error, setError] = useState(false);
  const styles = useMemo(() => makeStyles(C), [C]);

  useEffect(() => {
    regionCallbackRef.current = onRegionChangeComplete;
  }, [onRegionChangeComplete]);

  useEffect(() => {
    pressCallbackRef.current = onPress;
  }, [onPress]);

  useEffect(() => {
    isDarkRef.current = isDark;
  }, [isDark]);

  useEffect(() => {
    let cancelled = false;
    if (!mapElementRef.current || !initialRegion) return undefined;

    void loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapElementRef.current || mapRef.current) return;
        const map = new google.maps.Map(mapElementRef.current, {
          center: { lat: initialRegion.latitude, lng: initialRegion.longitude },
          zoom: regionToZoom(initialRegion),
          mapTypeId: mapType === 'satellite' ? 'satellite' : 'roadmap',
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          styles: isDarkRef.current ? DARK_MAP_STYLE : undefined,
        });
        mapRef.current = map;
        if (serviceArea) {
          circleRef.current = new google.maps.Circle({
            map,
            center: { lat: serviceArea.center.latitude, lng: serviceArea.center.longitude },
            radius: serviceArea.radius,
            fillColor: '#079b5c',
            fillOpacity: 0.12,
            strokeColor: '#079b5c',
            strokeOpacity: 0.75,
            strokeWeight: 2,
          });
        }
        map.addListener('dragstart', () => onPanDrag?.());
        /* Tap-to-select: react-native-maps reports touches through onPress
           with a nativeEvent.coordinate — reproduce that exact shape on web
           so LocationSearch needs no platform branch. */
        map.addListener('click', (event: any) => {
          const latLng = event?.latLng;
          if (!latLng) return;
          pressCallbackRef.current?.({
            nativeEvent: {
              coordinate: { latitude: latLng.lat(), longitude: latLng.lng() },
            },
          });
        });
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

  useEffect(() => () => {
    circleRef.current?.setMap(null);
    circleRef.current = null;
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !initialRegion) return;
    map.setCenter({ lat: initialRegion.latitude, lng: initialRegion.longitude });
    map.setZoom(regionToZoom(initialRegion));
  }, [initialRegion]);

  /* Layers toggle — mirrors react-native-maps' mapType prop. */
  useEffect(() => {
    mapRef.current?.setMapTypeId(mapType === 'satellite' ? 'satellite' : 'roadmap');
  }, [mapType]);

  /* Dark mode restyle — mirrors react-native-maps' customMapStyle. */
  useEffect(() => {
    mapRef.current?.setOptions({ styles: isDark ? DARK_MAP_STYLE : undefined });
  }, [isDark]);

  useEffect(() => {
    if (!serviceArea || !circleRef.current) return;
    circleRef.current.setCenter({ lat: serviceArea.center.latitude, lng: serviceArea.center.longitude });
    circleRef.current.setRadius(serviceArea.radius);
  }, [serviceArea]);

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

const makeStyles = (C: BasePalette) => StyleSheet.create({
  mapElement: {
    width: '100%',
    height: '100%',
  } as any,
  errorOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: C.greyLight,
  },
});

export default AppMapView;
