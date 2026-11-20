import { useEffect, useState } from "react";
import { api } from "./api";
export function useSetupStatus() {
  const [status, setStatus] = useState<{ turnstileConfigured: boolean }>(),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api("setup")
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch(() => {
        if (active)
          setError(
            "Could not check spam protection. Open Core settings to review it.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  return { status, error };
}
