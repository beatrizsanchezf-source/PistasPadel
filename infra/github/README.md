# Protección del repositorio GitHub con Terraform

Esta configuración consulta el repositorio existente `beatrizsanchezf-source/PistasPadel` y administra únicamente la protección de la rama `main`. No crea ni elimina el repositorio, no sobrescribe archivos ni despliega la aplicación o PostgreSQL.

## Requisitos

- Terraform 1.6 o posterior.
- Un token de GitHub con lectura del repositorio y permiso `Administration: Read and write` para gestionar protección de ramas. Terraform lo lee desde `GITHUB_TOKEN`; no guardes el token en archivos `.tf` ni lo subas a Git.

En Windows, puedes instalar Terraform con `winget` desde PowerShell:

```powershell
winget install --id Hashicorp.Terraform --exact
```

Después abre una terminal nueva y confirma la instalación:

```powershell
terraform -version
```

En PowerShell, define la variable para la sesión actual:

```powershell
$env:GITHUB_TOKEN = "<token>"
```

## Validar y revisar el plan

Ejecuta desde la raíz del repositorio:

```powershell
terraform -chdir=infra/github init
terraform -chdir=infra/github fmt -check
terraform -chdir=infra/github validate
terraform -chdir=infra/github plan
```

El plan protege la rama indicada en `protected_branch` y configura:

- Pull requests obligatorios.
- Una aprobación por defecto; las aprobaciones obsoletas se descartan.
- Historial lineal y resolución de conversaciones obligatorios.
- Force-push y borrado de la rama deshabilitados.
- Reglas aplicadas también a administradores.

Si eres la única persona que puede revisar, establece `required_approvals` en `0` o añade otra persona revisora. El requisito de pull request permanece activo incluso con cero aprobaciones.

Revisa el plan antes de aplicar los cambios:

```powershell
terraform -chdir=infra/github apply
```

La protección de ramas depende del plan y tipo de repositorio de GitHub. Si GitHub rechaza la operación para un repositorio privado, comprueba que el plan de la cuenta permite reglas de protección.

## Importar una protección existente

Si ya existe una regla de protección para `main`, impórtala antes de ejecutar `apply` para que Terraform la gestione en lugar de intentar crearla de nuevo:

```powershell
terraform -chdir=infra/github import github_branch_protection.main PistasPadel:main
terraform -chdir=infra/github plan
```

Revisa cuidadosamente cualquier cambio propuesto después de importar.

## Personalizar

Las variables están declaradas en `variables.tf`. Puedes sobrescribirlas desde la línea de comandos:

```powershell
terraform -chdir=infra/github plan `
	-var="protected_branch=main" `
	-var="required_approvals=2"
```

## Estado de Terraform

El estado local puede incluir metadatos de GitHub y debe tratarse como sensible. `.gitignore` excluye `.terraform/`, archivos de estado y archivos `*.tfvars`. Para colaboración entre varias personas, configura un backend remoto con control de acceso y bloqueo de estado.
