// Crea reuniones de Zoom con una app "Server-to-Server OAuth" de la cuenta de Barbi.
// Si faltan las credenciales devuelve null y la clase se guarda sin link.

async function token() {
  const { ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET } = process.env;
  if (!ZOOM_ACCOUNT_ID || !ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) return null;
  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { Authorization: "Basic " + Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString("base64") },
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`Zoom token: ${res.status}`);
  return (await res.json()).access_token as string;
}

export async function crearReunionZoom(opts: { tema: string; inicio: Date; duracionMin: number }) {
  const t = await token();
  if (!t) return null;
  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: opts.tema,
      type: 2,
      start_time: opts.inicio.toISOString(),
      duration: opts.duracionMin,
      timezone: "America/Argentina/Buenos_Aires",
      settings: { join_before_host: false, waiting_room: true },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Zoom meeting: ${res.status}`);
  const m = await res.json();
  return { id: String(m.id), joinUrl: m.join_url as string };
}

export async function borrarReunionZoom(id: string) {
  const t = await token();
  if (!t) return;
  await fetch(`https://api.zoom.us/v2/meetings/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
}
