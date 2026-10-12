# Mapas y ubicación en BUDDY

Estado al 2026-10-12. Verificado en la documentación oficial ese día.

## Comparación

| Opción | Costo | Límites | Expo Go | Build instalable | Atribución | Riesgos |
|---|---|---|---|---|---|---|
| **react-native-maps** (Apple Maps en iOS, Google Maps en Android) | Google: las cargas de mapa del SDK nativo para Android/iOS ("Mobile Native Dynamic Maps") figuran a **0 USD** en la página de facturación del Maps SDK. Apple Maps: sin costo en la app. | Términos de Google Maps Platform; Street View se cobra aparte. | **Sí, incluido y "No additional setup is required"** (doc. SDK 57) | Sí. En Android requiere clave de Google Maps restringida al paquete y SHA-1 (`androidGoogleMapsApiKey`) | Los mapas muestran su propio logotipo y avisos | Clave y cuenta de facturación de Google para producción en Android; no funciona en web |
| **MapLibre React Native** + teselas de un proveedor | Según el proveedor de teselas (p. ej. capas gratuitas con límite) | Los del proveedor elegido | **No** ("can't be used with Expo Go") | Sí, con su config plugin | La del proveedor y OpenStreetMap | Más configuración; elegir y pagar un proveedor de teselas |
| **Leaflet / mapa embebido de OpenStreetMap** (WebView o iframe) | Gratis | **Política de teselas de la OSMF**: uso ligero, User-Agent propio, sin descarga masiva ni uso sin conexión, sin garantía ("no SLA") y puede bloquearse sin aviso | Con WebView, sí | Sí | Obligatoria: "© colaboradores de OpenStreetMap" | No apto para tráfico de producción en tile.openstreetmap.org |
| **Mapbox** | Capa gratuita y luego pago por uso | Los de su plan | **No** (requiere build de desarrollo) | Sí | Obligatoria | Token y facturación |
| **Geocodificación (Nominatim de OSM)** | Gratis | Límites estrictos (uso bajo, sin masivo) | — | — | Obligatoria | No se usa: BUDDY no convierte direcciones en coordenadas; "Cómo llegar" abre la app de mapas del teléfono |

## Decisión

- **Ahora (Expo Go):** `react-native-maps` detrás del componente propio `LocationMap` (`src/components/location-map.tsx`), sin clave: Apple Maps en iOS y Google Maps en Android dentro de Expo Go.
- **En web** (solo para las pruebas y la vista previa en el navegador): mapa embebido de OpenStreetMap (`location-map.web.tsx`) con su atribución, uso ligero.
- **Producción:** `react-native-maps` con Apple Maps en iOS y Google Maps en Android con clave restringida al paquete (las cargas nativas cuestan 0 USD según Google; vigilar los términos). Alternativa sin Google: MapLibre con un proveedor de teselas con contrato (requiere build de desarrollo).
- Cambiar de proveedor solo toca `LocationMap`.

## Qué hace la app hoy

- Solo con el **consentimiento del adulto mayor** (él acepta, rechaza o revoca; el administrador solo solicita), en **primer plano** y con permiso pedido en contexto (`expo-location`, solo "mientras se usa la app").
- La ubicación se renueva cada 10 minutos mientras la pantalla del adulto mayor está abierta; se guardan las últimas 20; al revocar se **borran de verdad**.
- Sin ubicación real no hay mapa: estados "Ubicación no compartida", "Esperando la respuesta" y "Aceptó; aparecerá cuando abra BUDDY". Aviso de "desactualizada" después de 30 minutos.
- **Límite honesto:** sin servidor, la ubicación se guarda en el teléfono donde se comparte; verla desde el celular del administrador requiere la Fase 2. Segundo plano y zonas seguras: Fase 5.

## Fuentes

- Expo SDK 57, MapView: https://docs.expo.dev/versions/v57.0.0/sdk/map-view/
- Política de uso de teselas de la OSMF: https://operations.osmfoundation.org/policies/tiles/
- Facturación del Maps SDK para Android e iOS: https://developers.google.com/maps/documentation/android-sdk/usage-and-billing y https://developers.google.com/maps/documentation/ios-sdk/usage-and-billing
- MapLibre React Native con Expo: https://maplibre.org/maplibre-react-native/docs/setup/expo
