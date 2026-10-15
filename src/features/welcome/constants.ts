// Native splash = background color + heart. These must match the `expo-splash-screen` plugin in
// app.json (backgroundColor, imageWidth) so WelcomeScreen can draw the same heart in the same spot
// and the handoff from the native splash is seamless.
export const SPLASH_BACKGROUND = '#CF3B57';
export const SPLASH_IMAGE_SIZE = 288;

// Gradient of the sign-in screen design (top-left salmon, red-pink, deep purple bottom-right). It is
// specific to this screen, so it is not a design system token.
// SPLASH_BACKGROUND is the color of this gradient at the center of the screen.
export const WELCOME_GRADIENT_COLORS = ['#EF937E', '#E44358', '#8B2154'] as const;
export const WELCOME_GRADIENT_LOCATIONS = [0, 0.35, 1] as const;

// Sign-in block under the logo: the divider's height (its spacing and the button come from tokens).
export const DIVIDER_HEIGHT = 14;
