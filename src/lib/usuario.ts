/** Permite ingresar con un nombre de usuario en vez de mail (ej. "barbitest").
 *  Internamente Supabase necesita un mail: se usa uno ficticio que nunca recibe correos. */
export const DOMINIO_USUARIOS = "usuarios.test";

export function aEmail(valor: string) {
  const v = valor.trim().toLowerCase();
  return v.includes("@") ? v : `${v}@${DOMINIO_USUARIOS}`;
}

export function mostrarUsuario(email: string | null | undefined) {
  return email?.endsWith("@" + DOMINIO_USUARIOS) ? email.split("@")[0] : email ?? "";
}
