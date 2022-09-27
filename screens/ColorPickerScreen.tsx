import {useState} from 'react'
import {Button, View} from 'react-native'
import ColorPicker from 'react-native-wheel-color-picker'
import {RootTabScreenProps} from '../types';

export default function ColorPickerScreen({route, navigation}) {
    const [color, setColor] = useState(route.params.color);

    return (
        <View style={[]}>
            <ColorPicker
                onColorChange={color => setColor(color)}
            />
            <Button title="Select" onPress={() =>
                navigation.navigate({
                    name: 'MapTab',
                    params: {color},
                    merge: true,
                })
            } />
        </View>
    );
}
