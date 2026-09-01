"use client";
export default function PrintButton({ label = "🖨️ Imprimir / Guardar PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-bold text-white active:brightness-95 print:hidden">
      {label}
    </button>
  );
}
