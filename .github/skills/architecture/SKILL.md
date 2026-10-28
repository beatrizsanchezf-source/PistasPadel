---
name: architecture
description: 'Use when refactoring project layers, applying SOLID, extracting use cases, changing dependency direction, or deciding where business and persistence rules belong.'
---

# Arquitectura y SOLID

## Cuándo usarla

- Refactorizaciones que mueven responsabilidades entre UI, API y dominio.
- Extracción o modificación de casos de uso y límites de módulos.
- Evaluación de cohesión, dependencias o abstracciones.

## Procedimiento

1. Identifica el punto más cercano que decide o modifica el comportamiento antes de mover código.
2. Mantén las rutas API como adaptadores HTTP; coloca reglas persistentes en casos de uso de `src/lib/`.
3. Mantén componentes presentacionales; la autorización real vive en servidor.
4. Reutiliza módulos existentes como `reservation-use-cases.ts`, `user-use-cases.ts`, `auth.ts` y `prisma.ts` en vez de añadir capas paralelas.
5. Crea una abstracción solo cuando quite duplicación significativa o clarifique una frontera real; no refactorices por cumplir una etiqueta SOLID.
6. Añade pruebas centradas en el comportamiento y valida el contrato de la capa pública.
7. Actualiza `docs/architecture.md` y `Agents.md` si cambia una convención que afecte a tareas futuras.

## Estructura base

- `src/app/`: páginas, componentes, hooks y adaptadores HTTP.
- `src/lib/`: autenticación, validación, casos de uso y utilidades compartidas.
- `prisma/`: esquema, migraciones, semilla y mantenimiento de datos.
- La aplicación es un monolito modular; no introducir microservicios sin petición y justificación explícitas.