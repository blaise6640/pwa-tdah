import { useEffect, useState } from "react";

// Hook minimal pour charger `recharts` dynamiquement et renvoyer le module
export default function useRecharts() {
  const [lib, setLib] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    import("recharts")
      .then((m) => {
        if (mounted) setLib(m);
      })
      .catch((e) => {
        console.error("Failed to load recharts dynamically", e);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return lib;
}
