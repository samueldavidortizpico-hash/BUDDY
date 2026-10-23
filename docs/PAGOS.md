# Pagos y BUDDY Plus

Estado al 23 de octubre de 2026. No se cobra ni se solicitan datos de tarjeta en BUDDY. Los precios y las condiciones comerciales siguen por definir.

## Recomendación

Usar Apple In-App Purchase en iOS y Google Play Billing en Android para desbloquear funciones digitales. RevenueCat puede mantener un entitlement compartido (`buddy_plus`), ofrecer restauración de compras y simplificar la validación de recibos, pero no sustituye las cuentas ni el alta de productos en las tiendas. Para BUDDY se recomienda una pantalla propia y el SDK `react-native-purchases`, con el adaptador detrás de `EntitlementProvider`. `react-native-purchases-ui` no es necesario para esta pantalla.

La documentación de RevenueCat indica que en Expo Go detecta el entorno y cambia al Preview API: permite recorrer interfaz y lógica simulada, pero no completar compras. Las compras reales y pruebas con sandbox requieren un development build instalable y productos configurados. No hay claves públicas ni productos de RevenueCat configurados en este checkout. Solo se aceptarán claves públicas de SDK (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` y `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`) en configuración local/CI; nunca claves secretas `sk_` en el cliente o el repositorio.

Apple exige In-App Purchase para desbloquear funciones digitales, salvo excepciones de sus reglas. La comisión depende del programa y elegibilidad: Apple documenta tasas estándar y reducidas para Small Business Program y suscripciones renovables. Google Play exige Google Play Billing para suscripciones y funciones digitales dentro de la app, salvo excepciones; su comisión también depende del programa y elegibilidad. Confirmar condiciones vigentes al publicar, además de impuestos, territorios y requisitos de divulgación.

## Oferta propuesta

Los identificadores y las etiquetas de precio/prueba se centralizan en `src/domain/entitlements.ts`. `buddy_plus_monthly` y `buddy_plus_yearly` son identificadores de trabajo, no productos creados en las tiendas. Precio, duración de prueba y disponibilidad quedan pendientes de decisión comercial y configuración en App Store Connect / Play Console / RevenueCat. La interfaz debe presentar precio y renovación antes de compra, condiciones, política de privacidad y restauración.

Gratis para siempre: medicamentos, recordatorios, aviso escalonado, existencias, automatizaciones básicas, pedir ayuda, alertas de seguridad y un administrador. Plus: varios cuidadores y monitoreo con reloj/actividad. La lista de Plus debe poder crecer sin mover los controles de seguridad al plan de pago. La pantalla actual explica la oferta, pero no tiene botón de compra activo ni formulario de tarjeta. Restaurar compras consulta RevenueCat cuando exista SDK/configuración; sin oferta configurada informa que no encontró compras.

## Pasos y relojes

`expo-sensors` Pedometer forma parte de Expo Go según la documentación de Expo SDK 57. El módulo ofrece disponibilidad y permisos en iOS/Android. `getStepCountAsync` para rangos históricos solo está documentado para iOS (con hasta siete días); `watchStepCount` reporta pasos mientras la aplicación está en primer plano en ambas plataformas. Para un total diario/semanal Android hay que implementar Health Connect en un build instalable. La pantalla muestra solo valores devueltos por el sensor y no inventa datos.

El adapter existente `HealthProvider` queda como contrato para Apple Salud y Health Connect; sus implementaciones siguen explícitamente no disponibles hasta el build y permisos adecuados. Este entorno no tenía `adb` y no se probó Expo Go en un iPhone ni Android: el funcionamiento físico del podómetro está pendiente de los pasos de `docs/PRUEBAS_EN_DISPOSITIVO.md`.

## Requisitos antes de cobrar

1. Decidir precios, prueba, renovación, territorios, beneficios y textos legales.
2. Crear productos y grupos de suscripción en App Store Connect y Play Console; configurar la cuenta bancaria, fiscal, acuerdos de pago y cuentas de prueba.
3. Crear entitlement `buddy_plus` y offering/product mappings en RevenueCat; provisionar claves públicas por entorno sin registrarlas en Git.
4. Implementar compra/selección de paquete, errores, cancelación, restauración y expiración; verificar compras de prueba en builds nativos y revisión de tienda.
5. Definir identidad estable por cuenta y sincronización segura del entitlement entre dispositivos. Hoy la aplicación es local y no hay backend.
6. Revisar reglas de consumo, privacidad, términos y divulgación de renovación para Colombia y demás mercados de publicación.

## Fuentes oficiales

- [RevenueCat: instalación con Expo y Preview API](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [RevenueCat: claves públicas y secretas](https://www.revenuecat.com/docs/projects/authentication)
- [Expo SDK 57: Sensors](https://docs.expo.dev/versions/v57.0.0/sdk/sensors/)
- [Expo SDK 57: Pedometer](https://docs.expo.dev/versions/v57.0.0/sdk/pedometer/)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple Small Business Program](https://developer.apple.com/programs/whats-included)
- [Apple suscripciones y comisiones](https://developer.apple.com/app-store/subscriptions/)
- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- [Google Play service fees](https://support.google.com/googleplay/android-developer/answer/11131145?hl=en)
