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

## Cuándo limpiar caché (`clean:*`)

`npm run android` / `npm run ios` normales **no** limpian caché ni reinstalan la app —
son rápidos a propósito. Si después de cambiar algo nativo (los mismos casos de arriba)
la app sigue mostrando comportamiento viejo, o ves errores raros de Metro/Gradle/Xcode
que no tienen que ver con tu código, corré el clean correspondiente **antes** de
recompilar:

```
npm run clean:android && npm run android
npm run clean:ios && npm run ios
```

- `clean:metro` — borra caché de Metro/Haste y `.expo`. Rápido, no toca devices.
- `clean:android` — clean de Gradle + desinstala la app del device/emulador conectado.
- `clean:ios` — borra `ios/build` y el DerivedData de Xcode del proyecto + desinstala
  del simulador activo.
- `clean:all` — todo lo anterior más `node_modules` limpio (`npm install` de nuevo).

Desinstalar la app borra la sesión y los permisos ya otorgados (fotos, etc.) — por eso
esto no corre automáticamente en cada `npm run ios`/`android`, solo cuando hace falta.
