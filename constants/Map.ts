import {Dimensions} from "react-native";

export const GRID_SIZE = 5; // Odd numbers
export const TILE_SIZE = 0.0002;
export const TILE_DECIMAL = 4;

const screen = Dimensions.get('window');

export const ASPECT_RATIO = screen.width / screen.height;
export const LONGITUDE_DELTA = 1;
export const LATITUDE_DELTA = LONGITUDE_DELTA * ASPECT_RATIO;
