// src/types/google-maps.d.ts
declare global {
    interface Window {
        google: typeof google;
    }
}

declare namespace google {
    namespace maps {
        class Map {
            constructor(mapDiv: Element, opts?: MapOptions);
            setCenter(latLng: LatLng | LatLngLiteral): void;
            addListener(eventName: string, handler: Function): void;
        }

        class Marker {
            constructor(opts?: MarkerOptions);
            setPosition(latLng: LatLng | LatLngLiteral): void;
            getPosition(): LatLng | null;
            addListener(eventName: string, handler: Function): void;
        }

        class Geocoder {
            geocode(request: GeocoderRequest): Promise<GeocoderResult>;
        }

        namespace places {
            class PlacesService {
                constructor(map: Map);
                textSearch(request: TextSearchRequest, callback: (results: PlaceResult[] | null, status: PlacesServiceStatus) => void): void;
            }
        }

        interface MapOptions {
            center?: LatLng | LatLngLiteral;
            zoom?: number;
            mapTypeControl?: boolean;
            streetViewControl?: boolean;
            fullscreenControl?: boolean;
            zoomControl?: boolean;
            zoomControlOptions?: ZoomControlOptions;
        }

        interface MarkerOptions {
            position?: LatLng | LatLngLiteral;
            map?: Map;
            draggable?: boolean;
            title?: string;
        }

        interface ZoomControlOptions {
            position?: ControlPosition;
        }

        interface LatLng {
            lat(): number;
            lng(): number;
        }

        interface LatLngLiteral {
            lat: number;
            lng: number;
        }

        interface GeocoderRequest {
            location?: LatLng | LatLngLiteral;
        }

        interface GeocoderResult {
            results: GeocoderResultItem[];
        }

        interface GeocoderResultItem {
            formatted_address: string;
            geometry: {
                location: LatLng;
            };
        }

        interface TextSearchRequest {
            query: string;
            fields?: string[];
        }

        interface PlaceResult {
            formatted_address?: string;
            geometry?: {
                location?: LatLng;
            };
        }

        enum ControlPosition {
            RIGHT_TOP = 2,
        }

        enum PlacesServiceStatus {
            OK = 'OK',
        }

        interface MapMouseEvent {
            latLng: LatLng | null;
        }
    }
}

export { };
