function requireEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`${name} is required. Add it to your .env file.`);
    }
    return value;
}

export const billingUrl = requireEnv('EXPO_PUBLIC_BILLING_URL');

/** Display-friendly billing URL without protocol for on-screen copy. */
export function formatBillingUrlForDisplay(url: string = billingUrl): string {
    return url.replace(/^https?:\/\//, '');
}
