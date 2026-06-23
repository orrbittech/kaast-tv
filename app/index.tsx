import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { usePairing } from '../lib/context/PairingContext';
import { colors } from '../lib/theme/colors';

export default function Index() {
    const { pairing, isLoading } = usePairing();

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!pairing) {
        return <Redirect href="/(pairing)" />;
    }

    return <Redirect href="/(main)/library" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
