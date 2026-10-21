@AGENTS.md

## Producto (V3.0, detalle en docs/PRODUCTO.md)

BUDDY cuida a adultos mayores que viven solos, para los hijos que los cuidan a distancia. **Promesa:** "Aunque no estés a su lado, sabes que está bien. Y si algo no lo está, te enteras a tiempo." Vende tranquilidad y aviso temprano, no recordatorios. Paga el hijo; usa el adulto mayor.

- **Ciclo central:** configurar → recordar → confirmar → verificar → avisar → tranquilizar. Lo que no sirva a este ciclo se recorta o se pospone (Núcleo, Valor añadido y Futuro en `docs/ROADMAP.md`; interruptores en `src/config/features.ts`).
- **Principios:** nunca falla en silencio (si no puede verificar, lo dice); cero fricción para el adulto mayor; pocas alertas y con sentido; vista de un segundo para el hijo; registro útil para el médico; respeto y consentimiento del adulto mayor; BUDDY informa y nunca receta, diagnostica ni cambia dosis; calidad en celulares reales; invitación familiar como crecimiento.
- Sin registros, los estados lo dicen ("Aún no hay registros"); nunca "Todo bien" sin datos. Nunca "emergencia" para una toma sin confirmar. Nombre siempre BUDDY.

## Skills del proyecto

BUDDY es una app de cuidado del adulto mayor (React Native + Expo SDK 57 + TypeScript + Supabase). Usa estas Skills de `.claude/skills/`:

- **buddy-testing**: al escribir, revisar o planear pruebas (Jest, React Native Testing Library, integración, Maestro); al tocar navegación, registro de medicamentos, alarmas/horarios/zonas horarias, permisos, autenticación o accesibilidad; y **siempre antes de aprobar una fase**.
- **buddy-medical-safety**: **siempre** que el cambio toque medicamentos, interacciones, IA (incluida la extracción desde fotos), monitoreo de salud, alertas, datos de salud, consentimiento, claves o políticas de Supabase; y antes de habilitar cualquier evaluación médica para usuarios reales.
- **frontend-design**: dirección visual al crear o rediseñar UI.

Si un cambio cae en ambas (p. ej. registro de medicamentos), aplica las dos: `buddy-medical-safety` define qué es seguro y `buddy-testing` cómo verificarlo.

No instales dependencias ni modifiques la app sin autorización explícita del usuario.
