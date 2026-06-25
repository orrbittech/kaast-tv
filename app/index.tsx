import { Redirect } from 'expo-router';
import { usePairing } from '../lib/context/PairingContext';
import { TvStandbyScreen } from '../components/TvStandbyScreen';

export default function Index() {
    const { pairing, isLoading } = usePairing();

    if (isLoading) {
        return <TvStandbyScreen reason="loading" />;
    }

    if (!pairing) {
        return <Redirect href="/(pairing)" />;
    }

    return <Redirect href="/(main)/player" />;
}
