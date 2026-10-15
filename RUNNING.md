# Cómo levantar la app

## Requisitos (una sola vez)

- Node en la versión de `.nvmrc`: `nvm use`
- `.env` configurado (ver `.env.example`)
- Android Studio con el emulador **Pixel_8** creado (Device Manager → Create Device)
- Xcode con el simulador **iPhone 12 (iOS 26.5)** creado (Window → Devices and Simulators)

## Android

```
npm run android
```

Este comando solo:
1. Prende el emulador `Pixel_8` si no está corriendo.
2. Compila la app.
3. La instala en el emulador.
4. Levanta el servidor de desarrollo y abre la app.

Dejalo corriendo mientras programás — los cambios de código se reflejan solos (fast refresh).

### Uso diario (la app ya está instalada)

Si ya corriste `npm run android` antes y no cambiaste nada nativo (no instalaste una librería nueva, no tocaste `app.json`), alcanza con:

```
npm run android:fast
```

y apretar `a` en la terminal para abrir la app ya instalada, sin recompilar.

## iOS

```
npm run ios
```

Este comando:
1. Prende el simulador **iPhone 12 (iOS 26.5)** automáticamente si no está corriendo (a diferencia de Android, `expo run:ios` hace esto solo, sin script auxiliar).
2. Compila la app.
3. La instala en el simulador.
4. Levanta el servidor de desarrollo y abre la app.

Dejalo corriendo mientras programás — los cambios de código se reflejan solos (fast refresh).

### Uso diario (la app ya está instalada)

Si ya corriste `npm run ios` antes y no cambiaste nada nativo:

```
npm run ios:fast
```

y apretar `i` en la terminal para abrir la app ya instalada, sin recompilar.

## Dispositivo físico por USB

```
npm run android:device
```
```
npm run ios:device
```

Con el teléfono conectado por cable (USB debugging activo en Android; dispositivo confiado y registrado en Xcode para iOS), estos comandos muestran una lista de dispositivos detectados para elegir, compilan e instalan directo — sin configurar IPs manualmente.

## Cuándo hay que recompilar (`npm run android` / `npm run ios` de nuevo)

Solo cuando cambia algo **nativo**:
- Se instala una librería nueva con código nativo.
- Se cambia `app.json` (bundle id, package, plugins nativos, permisos).
- Se toca algo dentro de `ios/` o `android/`.

Para cambios normales de JS/TS, `npm run android:fast` / `npm run ios:fast` alcanza.

## Resetear los datos de DEV

Para probar la app desde cero (login con Google -> cuenta nueva -> onboarding completo):

1. Supabase -> SQL Editor -> pegar y correr `supabase/dev/reset_dev_data.sql`. Borra usuarios, perfiles, fotos (filas y archivos del bucket `develop`), intereses elegidos y turnos; deja intactos los catálogos y el esquema.
2. En el simulador/dispositivo: cerrar la app y volver a abrirla (la sesión guardada ya no existe, así que muestra el login).

Si querés vaciar el bucket de forma más completa: Storage -> `develop` -> `users` -> seleccionar las carpetas -> Delete (el SQL borra los registros de los archivos, pero Supabase avisa que no siempre libera el espacio de fondo).

Solo para DEV: nunca correrlo contra un proyecto con usuarios reales.
