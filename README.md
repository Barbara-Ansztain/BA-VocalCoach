# BA - Vocal Coach

Página para administrar las clases de canto de Barbi Ansztain: página pública con formulario de consulta, panel de administración (agenda, alumnos, pagos, material) y área de alumnos (reservas, pagos, material, grabaciones).

**Stack:** Next.js 16 · Supabase (login, base de datos, archivos) · Resend (mails) · Mercado Pago · Zoom.

## Puesta en marcha

1. `npm install`
2. Copiá `.env.example` a `.env.local` y completá las claves.
3. En Supabase → SQL Editor, corré `supabase/migrations/0001_init.sql`.
4. En Supabase → Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (después, el dominio real)
   - Redirect URLs: agregá `http://localhost:3000/auth/confirm` y la del dominio real.
5. Creá tu usuario (Authentication → Users → Add user) y hacelo admin:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Barbi Ansztain', tyc_accepted_at = now() where email = 'TU_MAIL';
   ```
6. `npm run dev` y entrá a http://localhost:3000. Iniciá sesión en `/ingresar` y vas a ir a `/panel`.

## Cómo funciona

| Quién | Qué |
|---|---|
| Visitante | Ve la página pública y manda una consulta. Tiene que aceptar los términos y condiciones (TyC). |
| Barbi | En **Consultas** toca "Dar acceso": el alumno recibe un mail, crea su contraseña y acepta los TyC (`/bienvenida`). |
| Alumno | Reserva en los horarios libres, reprograma o cancela con 24 h de aviso, paga con Mercado Pago o sube el comprobante, ve el material asignado y sube grabaciones. |
| Barbi | Ve el día en **Hoy**, la semana en **Agenda**, marca asistencias, confirma pagos, genera las cuotas del mes, comenta grabaciones y configura horarios y feriados. |

### Reglas (en `src/lib/reglas.ts`)
- Clase suelta $50.000 · Mensual 2 clases $100.000 · Mensual 4 clases $155.000.
- Cuota mensual del 1 al 10; desde el 11 se suma un 10% de recargo automáticamente.
- Cancelación con 24 h o más: la clase se recupera (si era clase suelta, no se cobra). Con menos de 24 h: mensual pierde la clase y la suelta se cobra igual.
- Mensuales: el alumno puede reservar hasta su cupo (2 o 4 por mes). Las extras, por ejemplo para recuperar feriados en meses de 5 semanas, las carga Barbi desde Agenda.
- Feriados: se cargan en Configuración y ese día no se puede reservar.
- Al reservar o reprogramar se manda un mail. Si la clase es online, se crea la reunión de Zoom y el link va en ese mail.

## Integraciones

- **Resend**: verificá tu dominio en resend.com y poné `EMAIL_FROM` con ese dominio. Sin clave, los mails no se mandan; se registran en la consola.
- **Mercado Pago**: `MP_ACCESS_TOKEN` (producción o prueba). En *Tus integraciones → Webhooks*, configurá `https://TU_DOMINIO/api/mercadopago/webhook` (evento *Pagos*) y copiá la clave secreta en `MP_WEBHOOK_SECRET`.
- **Zoom**: en marketplace.zoom.us creá una app *Server-to-Server OAuth* con el permiso `meeting:write:meeting:admin` (o `meeting:write`), y copiá Account ID, Client ID y Client Secret. Sin estas claves, las clases online se guardan sin link.
- **Plantilla de invitación** (Supabase → Authentication → Emails → Invite user): podés traducirla al español. El link usa `{{ .ConfirmationURL }}`.

## Deploy

En Vercel: importá el repo, cargá las mismas variables de entorno (con `NEXT_PUBLIC_SITE_URL` = dominio real) y actualizá las URLs de Supabase y del webhook de Mercado Pago.
