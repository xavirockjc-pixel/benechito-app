import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { ROLES, rolLabel, ROLES_ADMIN } from "@/lib/dominio/usuarios";
import { crearUsuario, actualizarUsuario, eliminarUsuario } from "./actions";
import CambiarPasswordForm from "./CambiarPasswordForm";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500";

export default async function UsuariosPage() {
  const actual = await usuarioActual();
  const yo = actual ? await prisma.usuario.findUnique({ where: { id: actual.sub } }) : null;

  // Solo propietario/admin
  if (!yo || !ROLES_ADMIN.includes(yo.rol)) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Usuarios</h1>
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          No tienes permiso para administrar usuarios. Pídeselo a un administrador.
        </p>
      </div>
    );
  }

  const usuarios = await prisma.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }] });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Usuarios del equipo</h1>
      <p className="text-sm text-slate-500">Crea cuentas, cambia contraseñas y asigna roles. Cada rol ve/usa lo suyo.</p>

      {/* Crear usuario */}
      <form action={crearUsuario} className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Nuevo usuario</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold text-slate-700">Nombre
            <input name="nombre" required className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Email
            <input name="email" type="email" required className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Rol
            <select name="rol" required defaultValue="vendedor" className={`mt-1 ${inputCls}`}>
              {ROLES.map((r) => <option key={r} value={r}>{rolLabel[r]}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Contraseña (mín. 6)
            <input name="password" type="text" required minLength={6} className={`mt-1 ${inputCls}`} />
          </label>
        </div>
        <button className="mt-4 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
          Crear usuario
        </button>
      </form>

      {/* Lista de usuarios */}
      <div className="mt-6 space-y-3">
        {usuarios.map((u) => {
          const soyYo = u.id === yo.id;
          return (
            <div key={u.id} className={`rounded-xl border p-4 shadow-sm ${u.activo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-900">
                    {u.nombre} {soyYo && <span className="text-xs font-normal text-[#1479c4]">(tú)</span>}
                  </p>
                  <p className="text-xs text-slate-500">{u.email} · {rolLabel[u.rol] ?? u.rol}{!u.activo && " · inactivo"}</p>
                </div>
              </div>

              {/* Editar rol / nombre / activo */}
              <form action={actualizarUsuario} className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <input type="hidden" name="id" value={u.id} />
                <label className="text-xs font-bold text-slate-600">Nombre
                  <input name="nombre" defaultValue={u.nombre} className={`mt-1 ${inputCls}`} />
                </label>
                <label className="text-xs font-bold text-slate-600">Rol
                  <select name="rol" defaultValue={u.rol} className={`mt-1 ${inputCls}`}>
                    {ROLES.map((r) => <option key={r} value={r}>{rolLabel[r]}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" name="activo" value="si" defaultChecked={u.activo} className="h-4 w-4 accent-[#1479c4]" /> Activo
                </label>
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Guardar</button>
              </form>

              {/* Cambiar contraseña (con confirmación visible) */}
              <CambiarPasswordForm id={u.id} inputCls={inputCls} />

              {!soyYo && (
                <form action={eliminarUsuario} className="mt-2">
                  <input type="hidden" name="id" value={u.id} />
                  <button className="text-xs font-semibold text-rojo/60 hover:text-rojo">Eliminar usuario</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
