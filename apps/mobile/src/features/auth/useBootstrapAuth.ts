import { useEffect } from "react";
import { useAuthStore } from "./useAuthStore";

export function useBootstrapAuth(): void {
  const bootstrap = useAuthStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);
}
