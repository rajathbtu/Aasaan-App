import React from 'react';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';

export type ServiceArea = {
	center: { latitude: number; longitude: number };
	radius: number;
};

type AppMapViewProps = React.ComponentProps<typeof MapView> & {
	serviceArea?: ServiceArea;
};

const AppMapView = React.forwardRef<MapView, AppMapViewProps>(({ serviceArea, ...props }, ref) => (
	<MapView {...props} ref={ref}>
		{serviceArea && (
			<Circle
				center={serviceArea.center}
				radius={serviceArea.radius}
				fillColor="rgba(37, 99, 235, 0.12)"
				strokeColor="rgba(37, 99, 235, 0.7)"
				strokeWidth={2}
			/>
		)}
	</MapView>
));

AppMapView.displayName = 'AppMapView';

export default AppMapView;
export { PROVIDER_GOOGLE };

// Re-export types so consumers can type refs/regions without importing
// react-native-maps directly (which would break the web bundle).
export type MapViewType = MapView;
export type { Region } from 'react-native-maps';
