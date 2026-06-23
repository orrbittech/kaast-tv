import {
    Pressable,
    StyleSheet,
    type PressableProps,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useState } from 'react';
import { Text } from './Text';
import { colors, spacing } from '../lib/theme/colors';
import { fonts } from '../lib/theme/fonts';

interface TVFocusableButtonProps extends Omit<PressableProps, 'disabled'> {
    label: string;
    subtitle?: string;
    style?: StyleProp<ViewStyle>;
    hasTVPreferredFocus?: boolean;
    variant?: 'primary' | 'secondary';
    /** When true, button stays focusable but does not fire onPress */
    disabled?: boolean;
}

export function TVFocusableButton({
    label,
    subtitle,
    style,
    hasTVPreferredFocus,
    variant = 'secondary',
    disabled = false,
    onPress,
    ...props
}: TVFocusableButtonProps) {
    const [focused, setFocused] = useState(false);
    const isInactive = Boolean(disabled);

    return (
        <Pressable
            {...props}
            hasTVPreferredFocus={hasTVPreferredFocus}
            focusable
            onPress={isInactive ? undefined : onPress}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
                styles.button,
                variant === 'primary' ? styles.primary : styles.secondary,
                focused && styles.focused,
                isInactive && styles.inactive,
                style,
            ]}
        >
            <Text style={[styles.label, isInactive && styles.inactiveLabel]}>
                {label}
            </Text>
            {subtitle ? (
                <Text style={[styles.subtitle, isInactive && styles.inactiveLabel]}>
                    {subtitle}
                </Text>
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        minWidth: 160,
    },
    primary: {
        backgroundColor: colors.primary,
    },
    secondary: {
        backgroundColor: colors.surface,
    },
    focused: {
        borderColor: colors.borderFocused,
        transform: [{ scale: 1.04 }],
    },
    inactive: {
        opacity: 0.45,
    },
    label: {
        fontFamily: fonts.semibold,
        color: colors.text,
        fontSize: 20,
        textAlign: 'center',
    },
    inactiveLabel: {
        color: colors.textMuted,
    },
    subtitle: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 4,
    },
});
