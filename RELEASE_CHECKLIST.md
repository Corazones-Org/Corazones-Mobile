# Checklist previo a un build de EAS (dev / preview / production)

Verificar **antes** de correr `eas build`, no después de que falle el login en el device.

## Google Sign-In — SHA-1 registrado en Google Cloud Console

Cada `buildProfile` de `eas.json` (`development`, `preview`, `production`) tiene su propio
keystore gestionado por EAS, con su propio SHA-1 fijo. Si el profile que vas a buildear no
aparece en la tabla de abajo con su SHA-1 ya cargado en Google Cloud Console, el login con Google
va a fallar con `DEVELOPER_ERROR` en esa build.

| Profile       | SHA-1                                              | Cargado en Google Cloud Console |
|---------------|-----------------------------------------------------|----------------------------------|
| `preview`     | `CB:71:44:99:6E:03:31:A5:54:31:C9:FB:0C:53:93:E1:51:92:F8:30` | Sí (2026-09-13) — verificado con login OK en device físico |
| `production`  | _(pendiente — obtener antes del primer build de producción)_ | No |
| `development` | usa el debug keystore local (Android Studio), ya cargado desde el setup inicial | Sí |

**Antes de cada build de un profile nuevo o sin SHA-1 confirmado en la tabla:**

1. Obtener el SHA-1 del keystore de ese profile:
   ```bash
   eas build:list --platform android --profile <profile> --limit 1 --json --non-interactive
   # tomar applicationArchiveUrl del build más reciente de ese profile (o generar uno nuevo)
   curl -sL -o build.apk "<applicationArchiveUrl>"
   $ANDROID_HOME/build-tools/<version>/apksigner verify --print-certs build.apk
   ```
   Copiar la línea `Signer #1 certificate SHA-1 digest`.
2. Pegarlo en Google Cloud Console → proyecto del `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` → OAuth
   Client ID tipo "Android" → agregar fingerprint para el package `com.corazones.mobile`.
3. Esperar ~1 minuto de propagación.
4. Actualizar la tabla de arriba con el SHA-1 y la fecha.

## Pendiente de revisar en código

- `useGoogleSignIn.ts` solo pasa `webClientId` e `iosClientId` a `GoogleSignin.configure()`.
  Existe también `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (en `.env.example` y en EAS) sin usar —
  confirmar si hace falta pasarla como `androidClientId`.
