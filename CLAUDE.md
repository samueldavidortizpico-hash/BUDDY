@AGENTS.md

## Skills del proyecto

BUDDY es una app de cuidado del adulto mayor (React Native + Expo SDK 57 + TypeScript + Supabase). Usa estas Skills de `.claude/skills/`:

- **buddy-testing**: al escribir, revisar o planear pruebas (Jest, React Native Testing Library, integración, Maestro); al tocar navegación, registro de medicamentos, alarmas/horarios/zonas horarias, permisos, autenticación o accesibilidad; y **siempre antes de aprobar una fase**.
- **buddy-medical-safety**: **siempre** que el cambio toque medicamentos, interacciones, IA (incluida la extracción desde fotos), monitoreo de salud, alertas, datos de salud, consentimiento, claves o políticas de Supabase; y antes de habilitar cualquier evaluación médica para usuarios reales.
- **frontend-design**: dirección visual al crear o rediseñar UI.

Si un cambio cae en ambas (p. ej. registro de medicamentos), aplica las dos: `buddy-medical-safety` define qué es seguro y `buddy-testing` cómo verificarlo.

No instales dependencias ni modifiques la app sin autorización explícita del usuario.
