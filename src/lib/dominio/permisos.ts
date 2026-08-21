// Permisos por rol dentro del panel (/admin). Cada rol ve/usa solo lo suyo (§35).
// Función pura (sirve en el middleware/edge y en el layout del panel).

export const ROLES_TERRENO = ["vendedor", "chofer"]; // solo la app /vendedor
export const ROLES_FULL = ["propietario", "admin"]; // ven TODO el panel

// Prefijo de ruta → roles (además de los "full") que pueden entrar.
// El dashboard (/admin) lo ven todos los roles de panel.
const ACCESO: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin/pos", roles: ["caja"] },
  { prefix: "/admin/ventas", roles: ["caja"] },
  { prefix: "/admin/pedidos", roles: ["caja"] },
  { prefix: "/admin/finanzas", roles: ["caja"] },
  { prefix: "/admin/negocios", roles: ["caja"] }, // clientes
  { prefix: "/admin/precios", roles: ["caja"] },
  { prefix: "/admin/preventa", roles: [] },
  { prefix: "/admin/rutas", roles: [] },
  { prefix: "/admin/inventario", roles: ["bodega", "produccion"] },
  { prefix: "/admin/reposiciones", roles: ["bodega"] },
  { prefix: "/admin/productos", roles: ["bodega", "produccion"] }, // catálogo
  { prefix: "/admin/produccion", roles: ["bodega", "produccion"] },
  { prefix: "/admin/sabores", roles: ["bodega", "produccion"] },
  { prefix: "/admin/usuarios", roles: [] }, // solo full
];

/** ¿Puede el rol acceder a esta ruta del panel? */
export function puedeAccederAdmin(rol: string, pathname: string): boolean {
  if (ROLES_TERRENO.includes(rol)) return false;
  if (ROLES_FULL.includes(rol)) return true;
  if (pathname === "/admin" || pathname === "/admin/") return true; // dashboard para todos

  // El prefijo más largo que coincida manda.
  const match = ACCESO
    .filter((a) => pathname === a.prefix || pathname.startsWith(a.prefix + "/") || pathname.startsWith(a.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!match) return false; // rutas del panel sin regla → denegadas para roles acotados
  return match.roles.includes(rol);
}
