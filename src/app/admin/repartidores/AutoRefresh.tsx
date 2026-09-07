"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca los datos del servidor cada N segundos (para ver la ubicación en vivo). */
export default function AutoRefresh({ seg = 25 }: { seg?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seg * 1000);
    return () => clearInterval(t);
  }, [router, seg]);
  return null;
}
