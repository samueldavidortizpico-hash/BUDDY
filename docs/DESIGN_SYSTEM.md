# BUDDY — Sistema de diseño

Fuente única: `src/theme/index.ts`. Ningún componente usa colores sueltos; todo sale de tokens.

## Color
- **Paleta del documento:** petróleo `#174A59`, menta `#5ED9B5`, blanco cálido `#F8FAF8`, coral `#F28C7A`, lavanda `#8B7CF6`, amarillo `#F4C95D`, cielo `#63B3FF`, éxito `#33C27F`, rojo `#E86C6C`, gris `#64748B`.
- **Derivados del Figma:** mint-dark `#21AD8B`, mint-pale `#E9FAF4`, petrol-deep `#0D3946`, coral-pale `#FFF0EC`, lavender-pale `#F0EDFF`, sky-pale `#EAF5FF`, slate-pale `#EEF3F3`, línea `#E4ECE9`, más los tintes por pantalla (`orbMint`, `waterTrack`, etc.).
- **`ink`:** colores de texto con contraste AA (`muted #56657A`, `mint #127A62`, `coral #B9433D`, `lavender #5B4BD0`, `sky #1F6FAE`, `yellow #86620C`, `success #0F7A55`, `red #C2413F`).
- **`tones`:** familias `{ bg, fg, solid, soft }` para mint, coral, lavender, sky, yellow, red, petrol y slate. Las usan iconos, tarjetas tinte, estados y chips.
- **`gradients`:** primary, coral (oscurecido), petrolCard, welcome, sleep, feeling, mood, wellness, hydration, achievement, onboarding×3, water, progress, bars, pills×3.

## Tipografía (Manrope)
| Variante | Tamaño / interlínea | Peso |
|---|---|---|
| display | 32 / 38 | 800 |
| h1 | 28 / 34 | 800 |
| h2 | 22 / 28 | 800 |
| h3 | 20 / 26 | 700 |
| body / bodyStrong | 18 / 26 | 500 / 700 |
| secondary / secondaryStrong | 16 / 23 | 500 / 700 |
| caption / captionStrong | 14 / 20 | 600 / 800 |
| eyebrow (mayúsculas, espaciado 1,4) | 12 / 16 | 800 |
| meta (horas de mensajes, metadatos) | 12 / 16 | 600 |
| button | 18 / 24 | 800 |

`AppText` multiplica por el tamaño elegido en Accesibilidad y respeta la escala del sistema (`allowFontScaling`, tope ×2).

## Espaciado, radios, sombras, toque
- **Espaciado (4 pt):** 4, 8, 12, 16, 20, 24, 32, 40. El margen de pantalla es 20.
- **Radios:** sm 12, md 16, botón 18, tarjeta 22 (hasta 25), modal 28, pastilla 999.
- **Sombras:** soft `0 5 18 rgba(petróleo, 8 %)`, elevated `0 12 34 rgba(petróleo, 10 %)`, más petrol, coral, mint, hero y night para CTA y tarjetas especiales.
- **Áreas de toque:** botones principales de 56 o más; el resto, 48 o más.

## Movimiento
- Presión con escala 0,97 y resorte (`damping 16, stiffness 260`).
- Entrada escalonada: aparece y sube 12 px, 60 ms entre elementos, 320 ms.
- Solo se anima transform y opacidad. Hay dos excepciones pequeñas y aisladas: el ancho de los puntos del onboarding y el `strokeDashoffset` del anillo SVG.
- Los bucles (robot flotando, orbes que respiran, puntos de escritura, pulso del micrófono) solo corren con la pantalla enfocada y se detienen con "reducir movimiento" (`useReducedMotion`).

## Componentes (`src/components`)
AppText · Icon (24 trazos del Figma) · PressableScale · Button (primary, coral, secondary, danger, ghost; lg/md; loading/disabled) · IconButton (soft, mint, plain, petrol; con etiqueta) · ButtonRow · Card (white, tint, gradient) · Chip · SegmentedControl · ProgressBar · ProgressRing · CountUp · Sparkline · BarChart · MoodSelector · SectionHeader · IconTile · StatCard · ListItem · StatusBadge · DoseStatusBadge · AlertStatusBadge · EmptyState · Notice · DemoBadge · ScreenHeader · ScreenContainer · Field · TextArea · TimeField · DateField · BottomTabBar · BuddyAvatar · BrandMark · BuddyHero · PersonAvatar · InitialsAvatar · PillVisual · ToastProvider/useToast · BottomSheet · SuccessBurst · ChatBubble · TypingIndicator · Appear · ComingSoon · SettingsGroup · SettingsRow · SwitchRow · TextScalePicker · MapIllustration · ActivityRow.

Se pueden ver todos en la galería `/dev/gallery` (solo en desarrollo).
