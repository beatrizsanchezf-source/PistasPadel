---
name: frontend
description: 'Use when modifying React UI, Next.js pages, login, client management, reservation forms, schedule board, hooks, accessibility, or Spanish user-facing text.'
---

# Interfaz React

## Cuándo usarla

- Cambiar `src/app/page.tsx`, componentes, hooks, estilos o interacciones de usuario.
- Ajustar login, gestión de clientes, formulario de reserva, agenda o iluminación.

## Procedimiento

1. Revisa el componente y las pruebas vecinas; sigue los patrones y estilos ya presentes.
2. Conserva `page.tsx` como composición/estado de pantalla y deja las responsabilidades visuales en `src/app/components/`.
3. Mantén la carga de agenda y su cancelación en `src/app/hooks/use-schedule.ts`.
4. Mantén textos visibles en español y asegura estados de carga, error, éxito y vacíos cuando la acción lo requiera.
5. No confíes en la visibilidad de botones para autorizar acciones; la API valida permisos en servidor.
6. Añade o actualiza pruebas con React Testing Library/Vitest para interacciones y permisos visibles.
7. Si la página cambia de manera relevante, ejecuta las pruebas E2E relacionadas con Playwright.

## Límites

- Evita mover reglas de dominio o persistencia a componentes React.
- No dupliques llamadas HTTP si ya existe un helper en `src/lib/client-api.ts`.
- Antes de utilizar una API nueva de Next.js, consulta la documentación local en `node_modules/next/dist/docs/`.