---
name: spec-driven-development
description: 'Use for feature work, behavior changes, architecture changes, or multi-step implementation. Apply automatic or hybrid Spec-Driven Development: derive requirements, acceptance criteria, constraints, implementation tasks, and verification.'
---

# Desarrollo guiado por especificaciones (SDD)

## Política del proyecto

Usa por defecto el modo **híbrido automático** en funcionalidades y cambios de comportamiento relevantes:

- El agente inspecciona el código cercano y redacta automáticamente una especificación breve desde la petición.
- Si la petición es clara y las decisiones son reversibles, el agente continúa con implementación y validación sin pedir aprobación ceremonial.
- Si falta una decisión de producto, privacidad, seguridad, persistencia o compatibilidad, presenta la especificación y pregunta solo por esa decisión antes de continuar.
- El usuario puede pedir explícitamente modo automático (resolver supuestos razonables y proceder) o modo híbrido (revisar la propuesta antes de implementar).

No generes un documento persistente para cambios triviales, mecánicos, typo-only o solo documentales. No conviertas una petición clara de implementación en una fase de aprobación innecesaria.

## Cuándo usarla

- Una nueva funcionalidad o flujo de usuario.
- Un cambio de contrato API, permisos, datos persistidos o comportamiento entre módulos.
- Una refactorización de varias etapas o con criterios de aceptación no obvios.
- Cuando el usuario pida explícitamente SDD, especificación, requisitos o plan de implementación.

## Flujo

1. **Descubrir:** usa la ruta, símbolo, fallo o comportamiento citado como ancla. Lee solo el código cercano necesario para identificar el controlador del comportamiento y un chequeo que pueda refutar la hipótesis.
2. **Especificar automáticamente:** resume objetivo, usuarios/actores, comportamiento esperado, criterios de aceptación verificables, restricciones, casos límite y pruebas. Separa hechos observados de supuestos.
3. **Elegir modo:**
   - **Automático:** continúa con supuestos locales de bajo riesgo; decláralos brevemente y procede.
   - **Híbrido:** presenta preguntas concisas si una decisión cambia alcance, UX, permisos, datos, seguridad o compatibilidad. Si no queda ninguna decisión bloqueante, procede.
4. **Persistir solo cuando aporte valor:** si el usuario pide una especificación escrita, o la tarea es amplia y duradera, crea `.github/specs/<nombre>/spec.md`. No inventes un sistema de carpetas por cada fix pequeño.
5. **Implementar:** vincula cada criterio con el cambio mínimo y prueba adecuada. Mantén la arquitectura y convenciones del proyecto; consulta las skills de dominio enlazadas en `Agents.md`.
6. **Verificar:** ejecuta primero el chequeo más estrecho capaz de falsar la especificación; después amplía lint, suite o build según el riesgo.
7. **Cerrar el ciclo:** informa qué criterios se cumplieron, pruebas ejecutadas y cualquier supuesto o criterio pendiente. Si los hallazgos cambian el alcance, actualiza la especificación antes de ampliar la implementación.

## Plantilla breve

Para especificaciones persistentes en `.github/specs/<nombre>/spec.md`:

```markdown
# <Nombre de la funcionalidad>

## Objetivo
<Resultado para el usuario o sistema>

## Alcance
- Incluye: ...
- Excluye: ...

## Requisitos y criterios de aceptación
- [ ] Dado ... cuando ... entonces ...

## Restricciones y casos límite
- ...

## Decisiones y supuestos
- Confirmado: ...
- Supuesto: ...

## Verificación
- Pruebas: ...
- Comprobaciones manuales: ...
```

## Reglas

- Los criterios deben ser observables y comprobables; evita requisitos vagos como “funciona correctamente”.
- No supongas aprobación humana cuando el usuario ya pidió implementar y no hay decisiones bloqueantes.
- No cambies requisitos durante la implementación de forma silenciosa; señala la diferencia y pide confirmación si afecta alcance o datos.
- Una especificación complementa, no sustituye, las pruebas ni la validación del código.