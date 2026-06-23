/** Brand colors — keep in sync with web/app/globals.css and apk/lib/theme/colors.ts */
export const colors = {
    base: '#171717',
    background: '#171717',
    surface: '#27272a',
    surfaceFocused: '#3f3f46',
    border: '#3f3f46',
    borderFocused: '#DD2C2C',
    primary: '#DD2C2C',
    primaryHsl: 'hsl(0 72% 52%)',
    text: '#ffffff',
    textMuted: '#a1a1aa',
    inputBackground: '#ffffff',
    inputBorder: '#e4e4e7',
    approve: '#16a34a',
    success: '#16a34a',
    warning: '#eab308',
    error: '#ef4444',
};

export const spacing = {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const radius = {
    md: 10,
    lg: 12,
};

export const tvFocusStyle = {
    borderWidth: 3,
    borderColor: colors.borderFocused,
    transform: [{ scale: 1.05 }],
};
