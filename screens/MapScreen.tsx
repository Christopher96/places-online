import {StyleSheet, Alert, TouchableOpacity, Platform} from 'react-native';
import MapView, {AnimatedRegion, LatLng, Marker, PROVIDER_GOOGLE} from 'react-native-maps';
import React, {useState, useRef, useEffect, useCallback, RefObject, ReactElement} from "react";
import * as Location from 'expo-location';
import {LocationAccuracy, LocationObject} from 'expo-location';
import {FontAwesome} from '@expo/vector-icons';
import {Text, View} from '../components/Themed';
import {GRID_SIZE, TILE_SIZE, TILE_DECIMAL, LATITUDE_DELTA, LONGITUDE_DELTA} from '../constants/Map';
import Tile from '../components/Tile';
import {RootTabScreenProps} from '../types';

export default function MapScreen({route, navigation}) {
    const map: RefObject<MapView> = useRef(null);
    const [selectedColor, setSelectedColor] = useState(null);

    useEffect(() => {
        if (route.params?.color) {
            setSelectedColor(route.params.color);
        }
    }, [route.params?.color]);

    let playerMarker = useRef(null);
    const playerMarkerCallback = useCallback((marker) => {
        playerMarker.current = marker;
    }, []);

    const [status, setStatus] = useState("Loading map...");
    const [loading, setLoading] = useState(true);
    const [follow, setFollow] = useState(false);

    const [playerLocation, setPlayerLocation] = useState(null);
    const [playerHeading, setPlayerHeading] = useState(0);
    const [cameraHeading, setCameraHeading] = useState(0);

    const [playerRegion, setPlayerRegion] = useState({
        latitude: 37.78825,
        longitude: -122.4324,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA
    });

    let playerMarkerCoords = new AnimatedRegion(playerRegion);
    // const playerMarkerRot = useState(new Animated.Value(0))[0];
    useEffect(() => {
        if (map.current && follow) {
            map.current.animateCamera({
                heading: playerHeading
            }, {duration: 100});
        }
    }, [playerMarker, playerHeading]);

    useEffect(() => {
        if (playerLocation == null) return;
        const newCoords = locToCoords(playerLocation);

        setPlayerRegion({
            ...playerRegion,
            ...newCoords
        });

        animateMarker(playerMarker, newCoords);

        if (map.current && follow) {
            map.current.setCamera({
                center: newCoords,
            }, {duration: 0});
        }

    }, [follow, playerLocation]);

    useEffect(() => {
        (async () => {
            Location.watchPositionAsync({accuracy: LocationAccuracy.High}, loc => setPlayerLocation(loc));
            Location.watchHeadingAsync(heading => {
                if (Math.abs(heading.trueHeading - playerHeading) > 3)
                    setPlayerHeading(Math.round(heading.trueHeading));
            });
            setStatus("Retrieving player location...");
            const loc = await getLocation();
            const coords = locToCoords(loc);
            setPlayerLocation(loc);
            setStatus("Rendering tiles...");
            renderGrid(closestTile(coords));
            setLoading(false);
        })();
    }, []);

    const locToCoords = (loc: LocationObject) => {
        return {latitude: loc.coords.latitude, longitude: loc.coords.longitude}
    }

    const closestTile = (coords: LatLng) => {
        return {
            latitude: (coords.latitude).toFixedNumber(TILE_DECIMAL - 1),
            longitude: (coords.longitude).toFixedNumber(TILE_DECIMAL - 1)
        }
    }

    const [grid, updateGrid] = useState<LatLng[]>([]);

    const renderGrid = (gridCenter: LatLng) => {
        let tmpGrid = [];
        const offset = Math.floor(GRID_SIZE / 2);
        for (let i = -offset; i < offset; i++) {
            for (let j = -offset; j < offset; j++) {
                const latitude = (gridCenter.latitude + (i * 2 * TILE_SIZE * LATITUDE_DELTA)).toFixedNumber(TILE_DECIMAL);
                const longitude = (gridCenter.longitude + (j * 2 * TILE_SIZE)).toFixedNumber(TILE_DECIMAL);
                tmpGrid.push({latitude, longitude});
            }
        }
        updateGrid(tmpGrid);
    }

    const onMapReady = async () => {
        animateCamera(locToCoords(playerLocation), 18);
    }

    const updateCameraHeading = async () => {
        map.current.getCamera().then(info => {
            setCameraHeading(info.heading);
        });
    }

    const animateMarker = (marker, newCoords) => {
        if (Platform.OS === 'android') {
            if (marker.current) {
                marker.current.animateMarkerToCoordinate(newCoords, 500);
            }
        } else {
            // `useNativeDriver` defaults to false if not passed explicitly
            playerMarkerCoords.timing({...newCoords, useNativeDriver: true}).start();
        }
    }

    const animateCamera = async (newCoords, zoom) => {
        map.current.animateCamera({
            center: newCoords,
            zoom
        }, {duration: 500});
    }

    const getLocation = async () => {
        let {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission to access location was denied');
            return null;
        }

        return await Location.getCurrentPositionAsync({});
    };

    const colorPicker = () => {
        navigation.navigate({
            name: 'ColorPicker',
            params: {selectedColor},
            merge: true,
        });
    };

    const followMe = async () => {
        setFollow(current => !current);
    };

    const findMe = async () => {
        setFollow(false);
        const loc = await getLocation();
        animateCamera(locToCoords(loc));
    }

    return (
        <View style={styles.container} >
            {loading
                ? <Text>{status}</Text>
                : <>
                    <MapView
                        ref={map}
                        provider={PROVIDER_GOOGLE}
                        scrollEnabled={!follow}
                        zoomEnabled={!follow}
                        rotateEnabled={!follow}
                        pitchEnabled={!follow}
                        onMapReady={onMapReady}
                        customMapStyle={mapStyle}
                        style={styles.map}
                        toolbarEnabled={false}
                        showsMyLocationButton={false}
                        showsUserLocation={false}
                        onTouchEnd={updateCameraHeading}
                        onTouchCancel={updateCameraHeading}
                        onTouchStart={updateCameraHeading}
                        onTouchMove={updateCameraHeading}
                    >
                        <Marker.Animated
                            anchor={{x: 0.5, y: 0.5}}
                            ref={playerMarkerCallback}
                            coordinate={playerMarkerCoords}
                        >
                            <FontAwesome style={{
                                transform: [{rotate: `${playerHeading - cameraHeading - 45}deg`}],
                            }} rotation={-45} size={30} name="location-arrow" />
                        </Marker.Animated>
                        {grid.map((coords, i) => (
                            <Tile key={i} center={coords} selectedColor={selectedColor} />
                        ))}
                    </MapView>
                    <View style={[styles.buttonContainer, styles.topRight]}>
                        <TouchableOpacity
                            style={[styles.bubble, styles.button]}
                        >
                            <Text>{playerRegion.latitude.toFixed(3)}, {playerRegion.longitude.toFixed(3)}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.buttonContainer, styles.bottomRight]}>
                        <TouchableOpacity
                            onPress={colorPicker}
                            style={[styles.bubble, styles.button, (selectedColor != null) ? {backgroundColor: selectedColor} : {}]}

                        >
                            <FontAwesome size={30} name="eyedropper" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={followMe}
                            style={[styles.bubble, styles.button, follow ? styles.active : {}]}
                        >
                            <FontAwesome color={follow ? "white" : "black"} size={30} name="compass" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={findMe}
                            style={[styles.bubble, styles.button]}
                        >
                            <FontAwesome size={30} name="crosshairs" />
                        </TouchableOpacity>
                    </View>
                </>}
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loading: {
        display: 'flex'
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    separator: {
        marginVertical: 30,
        height: 1,
        width: '80%',
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    button: {
        paddingHorizontal: 12,
    },
    active: {
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    bubble: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 20,
        marginBottom: 10,
    },
    buttonContainer: {
        position: 'absolute',
        marginHorizontal: 10,
        backgroundColor: 'transparent',
    },
    bottomRight: {
        right: 0,
        bottom: 0,
    },
    topRight: {
        right: 0,
        top: 0,
    }
});

const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#f5f5f5"
            }
        ]
    },
    {
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#616161"
            }
        ]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "color": "#f5f5f5"
            }
        ]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#bdbdbd"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#eeeeee"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#e5e5e5"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#757575"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#dadada"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#616161"
            }
        ]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#e5e5e5"
            }
        ]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#eeeeee"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#c9c9c9"
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#9e9e9e"
            }
        ]
    }
]
