"use client";

/** Botón que ejecuta una server action tras confirmar. Sirve para acciones que
 *  cambian stock (arrancar bodega, poner en 0) y conviene no tocar sin querer. */
export default function AccionConfirm({
  action,
  confirmMsg,
  className,
  hidden,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMsg: string;
  className?: string;
  hidden?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm(confirmMsg)) e.preventDefault(); }}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={className}>{children}</button>
    </form>
  );
}
