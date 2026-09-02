"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca la lista de pedidos cada `segundos` para ver los nuevos sin recargar. */
export default function AutoRefrescar({ segundos = 15 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);
  return null;
}
