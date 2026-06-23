import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radius, spacing } from '../lib/theme/colors';
import { fonts } from '../lib/theme/fonts';

const CODE_LENGTH = 6;

interface PairingCodeDisplayProps {
    code: string | null;
    loading?: boolean;
}

export function PairingCodeDisplay({ code, loading }: PairingCodeDisplayProps) {
    const digits = code?.padEnd(CODE_LENGTH, ' ').split('').slice(0, CODE_LENGTH) ?? [];

    if (loading) {
        return (
            <View style={styles.wrapper}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.row}>
            {Array.from({ length: CODE_LENGTH }, (_, index) => {
                const digit = digits[index]?.trim() ?? '';
                return (
                    <View key={index} style={styles.box}>
                        <Text style={styles.digit}>{digit}</Text>
                    </View>
                );
            })}
        </View>
    );
}

const BOX_SIZE = 72;
const DIGIT_SIZE = 48;

const styles = StyleSheet.create({
    wrapper: {
        paddingVertical: spacing.xl,
        minHeight: BOX_SIZE + spacing.xl * 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    box: {
        width: BOX_SIZE,
        height: BOX_SIZE,
        backgroundColor: colors.inputBackground,
        borderWidth: 1.5,
        borderColor: colors.inputBorder,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    digit: {
        fontFamily: fonts.semibold,
        fontSize: DIGIT_SIZE,
        color: '#000000',
        textAlign: 'center',
        includeFontPadding: false,
    },
});
