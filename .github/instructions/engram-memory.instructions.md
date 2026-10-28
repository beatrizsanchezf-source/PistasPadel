---
applyTo: "**"
---

# Memoria persistente con Engram

- Usa Engram solo cuando el servidor MCP `engram` esté disponible. No afirmes que una memoria se guardó si la herramienta no confirmó el resultado.
- Al iniciar trabajo relacionado con decisiones o tareas anteriores, consulta `mem_current_project` y confirma que el proyecto sea `pistas-padel`; usa `mem_context` o `mem_search` solo cuando el contexto previo sea materialmente útil.
- Guarda únicamente conocimiento duradero y verificado que sea costoso reconstruir: decisiones con su motivo, causas raíz no obvias, restricciones confirmadas y trabajo pendiente útil para retomar.
- No guardes cada turno, progreso rutinario, salida cruda de herramientas, secretos, credenciales, tokens, datos personales ni especulación.
- Antes de guardar, busca el tema y lee las memorias candidatas completas; actualiza una memoria existente cuando sea el mismo tema y evita duplicados.
- Para una memoria nueva, usa `mem_save` con alcance `project`, un título breve y contenido estructurado en `What`, `Why`, `Where` y `Learned`.
- No guardes automáticamente prompts completos del usuario. La memoria es interna y no sustituye la respuesta ni las pruebas.