# **SupCrud by Crudzaso**

---

# 1. Descripción General del Proyecto

SupCrud by Crudzaso es una plataforma SaaS de gestión de PQRS (Peticiones, Quejas, Reclamos y Sugerencias) que permite a negocios integrar un sistema de soporte en sus sitios web mediante un widget embebible.

El sistema debe permitir:

- Creación y administración de múltiples workspaces.
- Gestión de tickets por workspace.
- Gestión de agentes por workspace.
- Activación de funcionalidades adicionales (add-ons).
- Consulta pública de tickets mediante código único.
- Validación de identidad mediante OTP.
- Integración de IA para clasificación y auto-asignación.
- Gestión de adjuntos mediante Cloudinary.
- Publicación de documentación técnica en Docusaurus.

El nombre del producto es fijo:

**SupCrud by Crudzaso**

---

# 2. Arquitectura del Sistema

La solución debe componerse de:

- Frontend Web
- Backend API
- Base de datos SQL remota
- Base de datos MongoDB Atlas
- Cloudinary
- Integración con OpenAI API
- Docusaurus desplegado

Todas las partes deben estar desplegadas públicamente usando herramientas gratuitas.

---

# 3. Niveles del Sistema

---

## 3.1 Owner Global (Administrador de SupCrud)

Es el administrador principal de la plataforma completa.

### Autenticación

- Email y contraseña.
- El correo debe tener formato:

  [nombredelteam@crudzaso.com](mailto:nombredelteam@crudzaso.com)

No debe permitir Google OAuth para este rol.

### Funcionalidades obligatorias

Debe poder:

- Ver listado completo de workspaces.
- Ver estado de cada workspace (ACTIVE / SUSPENDED).
- Suspender o reactivar un workspace.
- Ver métricas globales:
  - Número total de tickets por workspace.
  - Tickets abiertos por workspace.
  - Add-ons activos por workspace.

- Gestionar catálogo de add-ons disponibles en la plataforma.

Este panel no pertenece a ningún workspace.

---

## 3.2 Workspace

Cada workspace representa un negocio independiente.

Cada workspace debe tener:

- Identificador único `workspaceKey`.
- Configuración propia.
- Add-ons activables individualmente.
- Usuarios asociados (ADMIN y AGENT).
- Tickets asociados.
- Configuración de IA.

---

## 3.3 Autenticación Workspace

ADMIN y AGENT deben poder autenticarse mediante:

- Email + contraseña.
- Google OAuth.

Un usuario puede pertenecer a múltiples workspaces.

Si pertenece a más de uno:

- Debe existir un selector de workspace tras autenticarse.
- El sistema debe operar únicamente bajo el workspace seleccionado.

---

# 4. Flujo del Usuario Final

El usuario final no tiene cuenta ni autenticación tradicional.

---

## 4.1 Creación del Ticket

Desde el widget embebible el usuario debe poder:

- Ingresar email válido.
- Ingresar asunto.
- Ingresar descripción.
- Seleccionar tipo:
  - P
  - Q
  - R
  - S

- Adjuntar archivos (si add-on activo).

### Al crear el ticket:

El sistema debe:

- Generar un `referenceCode` único global.
- El código debe:
  - Ser único en toda la plataforma.
  - Permitir identificar el workspace automáticamente.
  - No requerir que el usuario indique workspace.

- Guardar el ticket.
- Registrar evento de creación.
- Enviar correo al usuario con el código.

---

# 5. Consulta Pública de Ticket

Debe existir una página pública accesible sin autenticación.

El usuario debe ingresar únicamente:

referenceCode

El sistema debe:

- Identificar el workspace.
- Buscar el ticket correspondiente.

---

## 5.1 Vista Básica

Debe mostrar:

- Estado actual.
- Fecha de creación.
- Última actualización.

No debe mostrar:

- Conversación.
- Adjuntos.
- Historial completo.
- Asignación.

---

## 5.2 Vista Completa (Requiere OTP)

Para acceder al detalle completo:

1. Usuario solicita OTP.
2. Sistema genera código temporal.
3. Se envía al correo asociado al ticket.
4. Usuario ingresa OTP.
5. Si es válido:
   - Se habilita acceso temporal.
   - Se muestra:
     - Conversación completa.
     - Historial completo.
     - Adjuntos.
     - Información de asignación.
     - Datos adicionales del ticket.

### Reglas de OTP

- Expiración obligatoria.
- Límite de intentos.
- Registro de evento de validación.
- Debe invalidarse tras uso o expiración.

---

# 6. Panel Workspace

---

## 6.1 Gestión de Agentes

ADMIN debe poder:

- Invitar agente por correo.
- Generar token con expiración.
- Asociar usuarios existentes.
- Crear usuario nuevo si no existe.

Debe existir control de roles por workspace.

---

## 6.2 Gestión de Tickets

La bandeja debe incluir:

- Filtro por estado.
- Filtro por tipo.
- Filtro por prioridad.
- Filtro por agente.
- Filtro por fecha.
- Paginación obligatoria.

### Detalle del Ticket

Debe permitir:

- Ver información general.
- Ver historial de eventos.
- Ver conversación.
- Responder.
- Cambiar estado.
- Asignar o reasignar agente.
- Visualizar adjuntos.

Estados obligatorios:

- OPEN
- IN_PROGRESS
- RESOLVED
- CLOSED
- REOPENED

---

# 7. Add-ons por Workspace

Cada workspace puede activar funcionalidades individuales.

El backend debe validar que el add-on esté activo antes de ejecutar la funcionalidad.

---

## 7.1 Attachments

- Permite subir archivos.
- Debe integrarse con Cloudinary.
- Guardar metadata en base de datos.
- Si no está activo:
  - No permitir subida.
  - Backend debe rechazar solicitudes.

---

## 7.2 AI Assist

Debe integrarse con la API de OpenAI.

Debe permitir:

- Sugerir etiquetas.
- Sugerir categoría.
- Sugerir prioridad.
- Sugerir agente.

### Configuración por Workspace

- mode: APPROVAL | AUTO
- autoAssignEnabled
- confidenceThreshold

### Auto-asignación

Cada agente debe poder definir:

- Tipos de tickets que atiende.
- Categorías que atiende.

La IA debe:

- Analizar el ticket.
- Sugerir o asignar automáticamente a un agente que cumpla con esos criterios.

En modo AUTO:

- Si confidence >= threshold → asignar automáticamente.
- Si no → dejar como sugerencia.

Debe registrarse evento cuando IA aplica cambios.

---

## 7.3 Knowledge Base (Opcional)

Debe permitir:

- Crear artículo.
- Editar artículo.
- Publicar o despublicar.
- Buscar por palabra clave.
- Paginación obligatoria.

Los artículos deben ser visibles en el widget.

---

# 8. Persistencia

La estructura de base de datos es sugerida, no impuesta.

La implementación debe cumplir:

- Separación estricta por workspace.
- Unicidad del referenceCode.
- Control de roles.
- Control de add-ons.
- Soporte para paginación.
- Soporte para historial de eventos.
- Soporte para OTP.
- Soporte para adjuntos.

Se sugiere:

- SQL para identidad y control.
- MongoDB para tickets y operaciones dinámicas.

La estructura final es decisión del equipo.

---

# 9. Requisitos Técnicos Obligatorios

## Backend

Debe:

- Exponer API REST.
- Tener Swagger documentado.
- Validar autenticación y roles.
- Validar workspace activo.
- Validar add-ons antes de ejecutar funciones.
- Validar OTP.
- Generar códigos únicos seguros.
- Integrar OpenAI desde backend.
- Integrar Cloudinary.

---

## Frontend

Debe incluir:

- Landing.
- Panel Owner.
- Panel Workspace.
- Widget embebible.
- Página pública de consulta.

Debe:

- Implementar paginación real.
- Manejar estados de carga y error.
- Soportar Google OAuth.
- Mostrar nombre del equipo visible.
- El diseño visual es decisión del equipo.

---

# 10. Despliegue

Debe estar desplegado:

- Frontend.
- Backend.
- Swagger.
- Docusaurus.

Las herramientas de despliegue son libres siempre que:

- No requieran pago.
- Sean públicas.
- Funcionen correctamente.

---

# 11. Documentación

Debe publicarse en Docusaurus e incluir:

- Descripción general.
- Arquitectura.
- Modelo de datos.
- Flujos completos.
- Gestión de add-ons.
- Configuración de entorno.
- Links de despliegue.
- Nombre del equipo visible.

---
