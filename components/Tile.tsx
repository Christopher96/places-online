import {useState} from "react";
import {LatLng, Marker, Polygon} from "react-native-maps";
import {LATITUDE_DELTA, LONGITUDE_DELTA, TILE_DECIMAL, TILE_SIZE} from "../constants/Map";

interface TileProps {
    selectedColor: string | null
    center: LatLng
}

export default function Tile(props: TileProps) {
    const showCenter = true;
    const [color, setColor] = useState(null);

    const tileOnPress = () => {
        setColor(props.selectedColor);
    }

    const generateCorners = (center: LatLng) => {
        let indices = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
        let corners = indices.map(([i, j]) => {
            return {
                latitude: ((center.latitude + (i * TILE_SIZE * LATITUDE_DELTA))).toFixedNumber(TILE_DECIMAL),
                longitude: ((center.longitude + (j * (TILE_SIZE)))).toFixedNumber(TILE_DECIMAL)
            }
        });
        return corners;
    }

    return (
        <>
            <Polygon
                {...(color != null) && {fillColor: color}}
                coordinates={generateCorners(props.center)}
                tappable={true}
                onPress={tileOnPress}
            />
        </>
    )
}
