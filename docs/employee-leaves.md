# Permisos laborales

Entrada `Mis permisos` para cuentas personales; bandeja de revisión para administradores y superadministradores. La solicitud incluye tipo, intervalo en hora de Colombia, justificación y documento opcional. El backend determina identidad, sucursal y quién puede revisar; la selección operativa del POS no cambia el propietario del permiso.

Las decisiones requieren motivo y contraseña actual. El detalle muestra respuesta, soportes privados, plazo, regreso e historial. El trabajador confirma su regreso y el revisor verifica soporte/regreso con motivo. La confirmación borra la contraseña antes de esperar la petición y al cancelar, cambiar de usuario o desmontar; no inicia sesión ni la persiste. Un 409 requiere actualizar el detalle.

En Usuarios, `Tipo de cuenta` y `Acceso web` son conceptos independientes. La cuenta personal de cocina entra en sus permisos/perfil/documentos; una terminal separada abre la pantalla compartida de cocina y selecciona empleados para almorzar. Crear terminal exige confirmar la contraseña del administrador. No convertir cuentas existentes desde el formulario ni reactivar automáticamente empleados.

Los cambios dependen del backend PR #48 y se coordinan con Flutter PR #12. La guía de despliegue, migración de cuentas y bucket privado está en `docs/employee-leaves-deployment.md` del backend. Este PR no aplica SQL ni modifica producción. El smoke real de correo/FCM y usuarios se realiza después del despliegue autorizado.
