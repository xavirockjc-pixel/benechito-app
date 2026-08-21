// Dominio: usuarios del equipo y sus roles. Cada rol ve/usa lo suyo (§35).

export const ROLES = [
  "propietario",
  "admin",
  "caja",
  "bodega",
  "produccion",
  "vendedor",
  "chofer",
  "tecnico",
  "rrhh",
] as const;
export type Rol = (typeof ROLES)[number];

export const rolLabel: Record<string, string> = {
  propietario: "Propietario",
  admin: "Administrador",
  caja: "Caja",
  bodega: "Bodega",
  produccion: "Producción",
  vendedor: "Vendedor",
  chofer: "Chofer",
  tecnico: "Técnico",
  rrhh: "RR.HH.",
  equipo: "Equipo",
};

/** Roles que pueden administrar usuarios. */
export const ROLES_ADMIN = ["propietario", "admin"];

/** Roles que trabajan desde la app móvil de terreno (/vendedor). */
export const ROLES_TERRENO = ["vendedor", "chofer"];

export function esRol(v: string): v is Rol {
  return (ROLES as readonly string[]).includes(v);
}
