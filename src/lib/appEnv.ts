export type AppEnv = 'develop' | 'production';

const APP_ENVS: readonly AppEnv[] = ['develop', 'production'];

export function parseAppEnv(value: string | undefined): AppEnv {
  if (!value) {
    throw new Error('Falta configurar EXPO_PUBLIC_APP_ENV: develop o production (ver .env.example)');
  }
  if (!APP_ENVS.includes(value as AppEnv)) {
    throw new Error(
      `EXPO_PUBLIC_APP_ENV vale "${value}" y tiene que ser develop o production (ver .env.example)`
    );
  }
  return value as AppEnv;
}

// Which environment this build talks to. Expo inlines EXPO_PUBLIC_* at build time, so the
// reference must stay literal. EAS build profiles set it (eas.json); locally it comes from .env.
export const appEnv = parseAppEnv(process.env.EXPO_PUBLIC_APP_ENV);

// Storage has one bucket per environment, with the same folder layout inside: the bucket is named
// like the environment.
export const storageBucket: string = appEnv;
