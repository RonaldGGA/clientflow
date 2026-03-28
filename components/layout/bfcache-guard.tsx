// components/layout/bfcache-guard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function BfcacheGuard() {
  const router = useRouter();

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // persisted = true significa que la página viene del bfcache
      if (event.persisted) {
        router.refresh();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return null;
}
