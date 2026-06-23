import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { fonts } from '../lib/theme/fonts';

/**
 * App Text component with Urbanist font as default.
 * Pass fontFamily in style to override.
 */
export function Text({ style, ...props }: TextProps) {
    const flattened = style ? StyleSheet.flatten(style) : undefined;
    const hasFontFamily = flattened?.fontFamily != null;
    const baseStyle = !hasFontFamily ? { fontFamily: fonts.regular } : undefined;
    return (
        <RNText
            style={[baseStyle, style].filter(Boolean)}
            {...props}
        />
    );
}
