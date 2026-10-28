# Integración local de Engram

## Objetivo

Dar a Copilot de este workspace memoria persistente de proyecto mediante Engram MCP, sin guardar la base de datos en el repositorio ni modificar la configuración global de VS Code.

## Alcance

- Incluye: binario oficial Engram para Windows x64, configuración MCP portable del workspace e instrucciones de uso selectivo de memoria.
- Excluye: Engram Cloud, sincronización entre equipos, almacenamiento de prompts completos y cambios globales de VS Code o `PATH`.

## Requisitos y criterios de aceptación

- [x] Instalar la release estable desde el artefacto oficial y verificar su SHA-256 contra los checksums publicados.
- [x] Registrar Engram como servidor MCP del workspace con perfil `agent` y proyecto explícito `pistas-padel`.
- [x] Mantener la base SQLite en `%USERPROFILE%\.engram`, fuera del repositorio.
- [x] Instruir al agente para guardar solo conocimiento durable y confirmado, sin secretos ni transcripciones completas.
- [x] Confirmar con el protocolo MCP que el servidor inicia, expone `mem_current_project` y devuelve el proyecto `pistas-padel`.
- [ ] Confirmar en una sesión nueva de Copilot que VS Code carga las herramientas del workspace.

## Restricciones y casos límite

- El ejecutable debe existir en `%USERPROFILE%\bin\engram.exe` y la configuración usa `${USERPROFILE}` para no fijar una ruta personal.
- Windows puede aplicar políticas de ejecución a binarios descargados; no se deben desactivar controles de seguridad para forzar el arranque.
- Una configuración escrita no demuestra que VS Code haya iniciado el servidor ni que el agente pueda llamar sus herramientas.

## Decisiones y supuestos

- Confirmado: integración solo para el workspace y almacenamiento local.
- Supuesto: la ruta `C:\Users\beatr\bin` seguirá disponible para esta cuenta de Windows.
- Confirmado: no se configura sincronización remota ni cloud.

## Verificación

- Release: comparar el hash del ZIP y el fichero `checksums.txt` con los digests publicados por GitHub; ejecutar `engram version`.
- Configuración: validar `.mcp.json` como JSON y comprobar su ejecutable, argumentos y proyecto.
- Copilot: reiniciar/recargar los servidores MCP, abrir una sesión nueva y verificar una llamada de solo lectura `mem_current_project` que devuelva `pistas-padel`.