-- Las funciones auxiliares de seguridad pasan a un esquema que la API no expone.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

alter function public.is_admin() set schema private;
alter function public.my_profile_id() set schema private;
alter function public.handle_new_user() set schema private;

revoke execute on function private.is_admin() from public, anon;
revoke execute on function private.my_profile_id() from public, anon;
revoke execute on function private.handle_new_user() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.my_profile_id() to authenticated;
