# BUDDY — Auditoría de accesibilidad (Fase 1)

Criterios de la Skill `fixing-accessibility`, traducidos a React Native, y de `buddy-testing` §9. Público: adultos mayores.

## Contraste (WCAG 2.x)
Calculado con la fórmula de luminancia relativa. Se verifica automáticamente en `src/theme/__tests__/contrast.test.ts`, que falla si algún par baja del umbral.

### Texto (requisito: 4,5:1 o más)
| Par | Ratio |
|---|---|
| Petróleo `#174A59` / fondo `#F8FAF8` | 9,27 |
| Título `#0D3946` / fondo | 11,84 |
| Secundario `#56657A` / blanco | 5,94 |
| Secundario / fondo | 5,66 |
| Secundario / lavanda pálida `#F0EDFF` | 5,16 |
| Secundario / coral pálido `#FFF0EC` | 5,35 |
| Secundario / segmentado `#EDF3F2` | 5,29 |
| Blanco / botón primario (inicio `#174A59` · fin `#0D5E6D`) | 9,72 · 7,40 |
| Blanco / CTA coral (inicio `#C24E3B` · fin `#B84A3A`) | 4,72 · 5,15 |
| Petróleo / botón secundario `#E9FAF4` | 9,00 |
| Coral texto `#B9433D` / botón peligro `#FFF0EC` | 4,81 |
| Blanco / tarjeta sueño `#6257C7` | 5,66 |
| Lavanda clara `#C9C3FF` / noche `#28245F` | 8,45 |
| Menta `#5ED9B5` / petróleo | 5,59 |
| Lavanda clara / petróleo | 5,89 |
| Blanco / toast `#0D3946` | 12,42 |
| Menta texto `#127A62` / blanco · fondo · menta pálida | 5,27 · 5,02 · 4,88 |
| Amarillo texto `#86620C` / `#FFF5D3` | 5,11 |
| Lavanda texto `#5B4BD0` / `#F0EDFF` | 5,43 |
| Cielo texto `#1F6FAE` / `#EAF5FF` | 4,82 |
| Rojo texto `#C2413F` / `#FFEDED` | 4,51 |
| Petróleo / `#E8F0F1` | 8,41 |
| Título / amarillo `#F4C95D` (icono de logro) | 7,90 |

### Iconos y controles (requisito: 3:1 o más)
| Par | Ratio |
|---|---|
| Icono blanco / IconButton menta `#178C6F` | 4,19 |
| Icono pestaña activa `#127A62` / píldora `#E9FAF4` | 4,88 |
| Icono blanco / lavanda `#8B7CF6` | 3,33 |

### Ajustes realizados (pares que fallaban en el Figma)
| Original | Ratio | Ajuste | Nuevo |
|---|---|---|---|
| Blanco / coral `#F28C7A` (CTA) | 2,38 | Degradado `#C24E3B → #B84A3A` | 4,72 / 5,15 |
| Slate `#64748B` / lavanda pálida | 4,14 | `#56657A` | 5,16 |
| Mint-dark `#21AD8B` como texto / blanco | 2,83 | `#127A62` | 5,27 |
| Coral `#DB5D57` / coral pálido | 3,31 | `#B9433D` | 4,81 |
| Lavanda `#8B7CF6` texto / blanco | 3,33 | `#5B4BD0` | 5,43 |
| Cielo `#338BCE` / sky-pale | 3,32 | `#1F6FAE` | 4,82 |
| Amarillo `#9F7614` / amarillo pálido | 3,78 | `#86620C` | 5,11 |
| Éxito `#148B61` / verde pálido | 3,90 | `#0F7A55` | ≥ 4,85 |
| Rojo `#E86C6C` texto / blanco | 3,09 | `#C2413F` | 5,09 |
| Metadatos `#9AA8B5` / blanco | 2,43 | `#56657A` | 5,94 |
| Blanco / IconButton `#21AD8B` | 2,83 | `#178C6F` | 4,19 |
| Iniciales coral / coral pálido | 2,15 | `#B9433D` | 4,81 |

## Áreas táctiles
Botones principales de 56 o más; IconButton, chips, segmentos, filas, puntos del onboarding (área de 40×48) y pestañas de 48 o más; `hitSlop` en enlaces y en la cámara del perfil.

## Nombres, roles y estados
- Todo pulsable pasa por `PressableScale` con `accessibilityRole` (button, link, tab, radio, checkbox) y `accessibilityLabel`. Los iconos son decorativos (ocultos al lector).
- Hay grupos de opción única (`radiogroup` / `radio` + `checked`): ánimo, intensidad, calidad de sueño, presentación, frecuencia y tipo de registro. Los hábitos usan `checkbox`.
- Pestañas y segmentos usan `tab` con `selected`. Las barras y anillos de progreso usan `progressbar` con `accessibilityValue`.
- Errores de formulario: texto junto al campo con icono, `accessibilityRole="alert"` y región en vivo; el campo usa `aria-invalid` y el error se lee como pista.
- Los toasts se anuncian con `AccessibilityInfo.announceForAccessibility` y nunca son la única vía para información crítica.
- Las acciones destructivas (cerrar sesión, restablecer datos, revocar ubicación) piden confirmación en una hoja inferior.
- El estado nunca depende solo del color: los estados de toma llevan icono y texto ("Sin confirmar", "Tomada"…).

## Texto escalable
`allowFontScaling` siempre activo (tope ×2 por texto), más el selector propio (×1 / ×1,15 / ×1,3) en Perfil > Accesibilidad. Los diseños usan `minHeight`, `flexWrap` y filas que pasan a columna, sin alturas fijas en el texto. **Pendiente de verificar en el teléfono** con la letra del sistema al máximo, en TalkBack y en VoiceOver: no se pudo probar en dispositivo en esta sesión.

## Movimiento
`useReducedMotion` en todas las animaciones: sin bucles ni desplazamientos si está activo. Los bucles se pausan fuera de foco (`useIsFocused`).

## Pendiente
- Revisión manual con TalkBack y VoiceOver.
- Orden de foco en los modales en dispositivo.
- Prueba con escala de texto del 200 % en Android e iOS.
