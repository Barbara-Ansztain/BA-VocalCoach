module.exports = [
"[project]/.next-internal/server/app/primer-uso/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/actions/primer-uso.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "00d6a6b27fb5856a388a8527e3a6a2066ec35a4ffa",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$primer$2d$uso$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["hayAdmin"],
    "60fe843bc69378e8b095de1fe028abab7e827a1631",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$primer$2d$uso$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["crearAdmin"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$primer$2d$uso$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$src$2f$app$2f$actions$2f$primer$2d$uso$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/primer-uso/page/actions.js { ACTIONS_MODULE0 => "[project]/src/app/actions/primer-uso.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$primer$2d$uso$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/primer-uso.ts [app-rsc] (ecmascript)");
}),
"[project]/.next-internal/server/app/primer-uso/page/actions.js { ACTIONS_MODULE0 => \"[project]/src/app/actions/primer-uso.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$app$2f$actions$2f$primer$2d$uso$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/app/actions/primer-uso.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/src/app/actions/primer-uso.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"00d6a6b27fb5856a388a8527e3a6a2066ec35a4ffa":{"name":"hayAdmin"},"60fe843bc69378e8b095de1fe028abab7e827a1631":{"name":"crearAdmin"}},"src/app/actions/primer-uso.ts",""] */ __turbopack_context__.s([
    "crearAdmin",
    ()=>crearAdmin,
    "hayAdmin",
    ()=>hayAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$usuario$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/usuario.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
async function hayAdmin() {
    const { count } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])().from("profiles").select("id", {
        count: "exact",
        head: true
    }).eq("role", "admin");
    return (count ?? 0) > 0;
}
async function crearAdmin(_, form) {
    if (await hayAdmin()) return {
        error: "Ya hay una cuenta de administración. Ingresá desde /ingresar."
    };
    const email = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$usuario$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["aEmail"])(String(form.get("email") ?? ""));
    const password = String(form.get("password") ?? "");
    const nombre = String(form.get("nombre") ?? "").trim() || "Barbi Ansztain";
    if (email.startsWith("@")) return {
        error: "Escribí un mail o un usuario."
    };
    if (password.length < 6) return {
        error: "La contraseña tiene que tener al menos 6 caracteres."
    };
    const db = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$supabase$2f$server$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createAdminClient"])();
    const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: nombre
        }
    });
    if (error || !data.user) return {
        error: "No se pudo crear la cuenta: " + (error?.message ?? "error desconocido")
    };
    await db.from("profiles").update({
        role: "admin",
        full_name: nombre,
        plan: "suelta",
        tyc_accepted_at: new Date().toISOString()
    }).eq("user_id", data.user.id);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])("/ingresar?next=/panel&creada=1");
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    hayAdmin,
    crearAdmin
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(hayAdmin, "00d6a6b27fb5856a388a8527e3a6a2066ec35a4ffa", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(crearAdmin, "60fe843bc69378e8b095de1fe028abab7e827a1631", null);
}),
"[project]/src/lib/supabase/server.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createAdminClient",
    ()=>createAdminClient,
    "createClient",
    ()=>createClient
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/headers.js [app-rsc] (ecmascript)");
;
;
;
async function createClient() {
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://nifgzblriejwmctyzmzn.supabase.co"), ("TURBOPACK compile-time value", "sb_publishable_wzswN_34Rahip4z618fCnA_f0zrIsYB"), {
        cookies: {
            getAll: ()=>cookieStore.getAll(),
            setAll: (list)=>{
                try {
                    list.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // Llamado desde un Server Component: el middleware refresca la sesión.
                }
            }
        }
    });
}
function createAdminClient() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://nifgzblriejwmctyzmzn.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false
        }
    });
}
}),
"[project]/src/lib/usuario.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/** Permite ingresar con un nombre de usuario en vez de mail (ej. "barbitest").
 *  Internamente Supabase necesita un mail: se usa uno ficticio que nunca recibe correos. */ __turbopack_context__.s([
    "DOMINIO_USUARIOS",
    ()=>DOMINIO_USUARIOS,
    "aEmail",
    ()=>aEmail,
    "mostrarUsuario",
    ()=>mostrarUsuario
]);
const DOMINIO_USUARIOS = "usuarios.test";
function aEmail(valor) {
    const v = valor.trim().toLowerCase();
    return v.includes("@") ? v : `${v}@${DOMINIO_USUARIOS}`;
}
function mostrarUsuario(email) {
    return email?.endsWith("@" + DOMINIO_USUARIOS) ? email.split("@")[0] : email ?? "";
}
}),
];

//# sourceMappingURL=_0gr00_z2-el_b._.js.map