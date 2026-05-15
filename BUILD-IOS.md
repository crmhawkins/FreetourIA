# FreeTour IA - Guia de build iOS para TestFlight

Guia paso a paso para construir y subir la app FreeTour IA a TestFlight usando
EAS Build (perfil `preview`). Todo se ejecuta desde `apps/mobile/`.

## Pre-requisitos (una sola vez)

- Cuenta de Apple Developer Program activa (la misma que se usa para
  scanhawkins). Necesitas:
  - Tu Apple ID (email)
  - Tu Apple Team ID de 10 caracteres: https://developer.apple.com/account#MembershipDetailsCard
- Cuenta de Expo (https://expo.dev). Si no tienes, crea una con el mismo email.
- EAS CLI instalado globalmente (ya hecho durante la preparacion):
  ```
  npm install -g eas-cli@latest
  eas --version
  ```

## Configuracion ya aplicada en el repo

Lo siguiente ya esta preparado y no hay que tocar:

- `apps/mobile/app.json`
  - bundleIdentifier iOS: `com.freetour.ia`
  - buildNumber inicial: `1` (se auto-incrementa en cada build via `eas.json`)
  - Placeholders de Google Maps eliminados (iOS usa Apple Maps por defecto)
- `apps/mobile/eas.json`
  - Perfil `preview` configurado con `distribution: "store"` y `autoIncrement: true`
  - URL backend production: `https://api.freetour.hawkins.es`
- `apps/mobile/patches/expo-audio+0.4.9.patch` aplicado automaticamente via
  `postinstall` (parche para `new AudioModule.AudioPlayer(..., false)`).
- `expo-doctor` pasa los 17 checks.

## Pasos del build (en orden)

### 1. Login en Expo (una vez)

```
eas login
```

Te abrira el navegador. Si tu cuenta de Expo es nueva, crearla en
https://expo.dev/signup.

### 2. Inicializar el proyecto Expo

Desde la raiz del repo:

```
cd apps/mobile
eas init
```

Esto crea el proyecto en Expo y actualiza automaticamente
`extra.eas.projectId` en `app.json` con el ID real (reemplazando
`"your-eas-project-id"`).

> Si el comando pregunta por owner/account, elige tu cuenta personal o la
> organizacion de Hawkins si quieres compartirla con el equipo.

### 3. Configurar credenciales de Apple

```
eas credentials
```

Selecciona `iOS` -> `preview` (o `production`) y deja que EAS gestione:

1. Apple Developer login (usa tu Apple ID + password + 2FA cuando lo pida).
2. Crear/seleccionar Distribution Certificate.
3. Crear Provisioning Profile para `com.freetour.ia`.
4. Registrar la app en App Store Connect si todavia no existe (EAS te lo
   ofrece). El bundle ID es `com.freetour.ia` y el nombre `FreeTour IA`.

Al terminar tendras los certificados subidos a EAS y vinculados al bundle ID.

### 4. Rellenar datos de submit en `eas.json`

Edita `apps/mobile/eas.json` y rellena los placeholders de `submit.preview.ios`:

```jsonc
"submit": {
  "preview": {
    "ios": {
      "appleId": "TU_EMAIL_APPLE@example.com",
      "ascAppId": "1234567890",           // numerico - lo ves en App Store Connect -> Mi app -> General -> App Information
      "appleTeamId": "ABC123DEF4"         // 10 caracteres - https://developer.apple.com/account
    }
  }
}
```

> Si tambien vas a hacer release a App Store (no solo TestFlight), rellena
> tambien `submit.production.ios` con los mismos valores.

### 5. Lanzar el build

```
cd apps/mobile
eas build --profile preview --platform ios
```

- Tarda 15-25 minutos en la cola y build de EAS.
- Al terminar, EAS te devuelve una URL con el binario `.ipa` y un QR para
  testers internos.

### 6. Subir el build a TestFlight

```
eas submit --profile preview --platform ios
```

EAS sube el `.ipa` a App Store Connect. Tarda 5-15 min en procesarlo Apple
y aparecer en TestFlight.

### 7. Anadir testers en App Store Connect

1. Entra en https://appstoreconnect.apple.com -> tu app FreeTour IA.
2. Pestana `TestFlight` -> grupo `Internal Testing` (o crear uno
   `External Testing` para usuarios externos).
3. Anade emails de testers. Ellos recibiran invitacion para instalar via
   la app TestFlight de iOS.

> **Nota**: el primer build externo necesita "Beta App Review" de Apple
> (1-2 dias). Los internos (usuarios de tu Apple Developer team) no.

## Troubleshooting comun

### Build falla en "Install pods"

- Causa habitual: dependencia native sin autolink. Revisar
  `apps/mobile/package.json` y eliminar paquetes problematicos.
- O ejecutar `npx expo-doctor` localmente y arreglar lo que diga.

### Build falla con "Code signing failed"

- Re-ejecutar `eas credentials` y dejar que EAS regenere el provisioning
  profile.
- Verificar que `bundleIdentifier` en `app.json` coincide con el de los
  certificados (`com.freetour.ia`).

### Apple rechaza el build en TestFlight

- Privacy Manifest: ya esta declarado en `app.json` -> `ios.privacyManifests`.
  Si Apple pide mas APIs declaradas, anade entradas a `NSPrivacyAccessedAPITypes`.
- Encryption: si Apple pregunta por exportacion de cifrado, en App Store
  Connect -> TestFlight -> Build -> contestar "No usa cifrado no estandar"
  (axios+HTTPS estandar no cuenta).
- Background modes: la app usa `location` y `audio` en background. Apple
  puede pedir justificacion. Estan declarados en `ios.infoPlist.UIBackgroundModes`.

### Certificados expirados

```
eas credentials
```

Seleccionar `iOS` -> `Remove certificate` y luego volver a crear uno nuevo.

### El parche de `expo-audio` no se aplica

Verificar:
- Existe `apps/mobile/patches/expo-audio+0.4.9.patch`.
- `apps/mobile/package.json` tiene `"postinstall": "patch-package"`.
- `patch-package` esta en `devDependencies`.

Si EAS dice que falla el postinstall, mira en los logs si el patch dio un
hunk error - posiblemente expo-audio cambio de version. En ese caso hay que
regenerar el patch con la version nueva (ver "Regenerar el parche" abajo).

## Regenerar el parche de expo-audio (cuando suba la version)

1. En `apps/mobile/node_modules/expo-audio/build/ExpoAudio.js` busca las
   dos llamadas a `new AudioModule.AudioPlayer(parsedSource, updateInterval)`
   y anade `, false` como tercer argumento.
2. Como este monorepo usa workspaces, `patch-package` no puede crear el
   patch directamente desde `apps/mobile`. Crear el patch desde una carpeta
   tmp con su propio `package.json` + `package-lock.json` y copiar el
   resultado a `apps/mobile/patches/`.

## Para builds posteriores (production)

Cuando ya este probado en TestFlight y quieras release a App Store:

```
cd apps/mobile
eas build --profile production --platform ios
eas submit --profile production --platform ios
```

Y luego en App Store Connect -> `App Store` -> seleccionar el build ->
rellenar metadata, screenshots, descripciones -> "Submit for Review".

## Resumen del flujo TestFlight

```
eas login
cd apps/mobile && eas init                                # solo la 1a vez
cd apps/mobile && eas credentials                          # solo la 1a vez
# (rellenar apps/mobile/eas.json submit.preview.ios)
cd apps/mobile && eas build --profile preview --platform ios
cd apps/mobile && eas submit --profile preview --platform ios
# Anadir testers en App Store Connect -> TestFlight
```
