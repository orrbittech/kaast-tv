/** KAAST — Proprietary software of Orrbit Systems (https://www.orrbit.co.za/) */
import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from '@expo-google-fonts/urbanist/useFonts';
import {
    Urbanist_400Regular,
    Urbanist_500Medium,
    Urbanist_600SemiBold,
} from '@expo-google-fonts/urbanist';
import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { queryClient } from '../lib/api/query-client';
import { PairingProvider } from '../lib/context/PairingContext';
import { PlaybackProvider } from '../lib/context/PlaybackContext';
import { useMediaCacheInit } from '../lib/hooks';

SplashScreen.preventAutoHideAsync();

function AppProviders({ children }: { children: React.ReactNode }) {
    useMediaCacheInit();
    return (
        <QueryClientProvider client={queryClient}>
            <PairingProvider>
                <PlaybackProvider>{children}</PlaybackProvider>
            </PairingProvider>
        </QueryClientProvider>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        Urbanist_400Regular,
        Urbanist_500Medium,
        Urbanist_600SemiBold,
        Caveat_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <AppProviders>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
        </AppProviders>
    );
}
