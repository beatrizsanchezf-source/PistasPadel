"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ScheduleCourt } from "@/lib/client-api";
import { clubDateKey } from "@/lib/club-time";

export function useSchedule(date: Date, enabled: boolean) {
  const [courts, setCourts] = useState<ScheduleCourt[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const selectedDateKey = clubDateKey(date);
  const requestKey = `${enabled ? "active" : "inactive"}:${selectedDateKey}`;
  const loading = enabled && loadedKey !== requestKey;

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoadedKey("");
    try {
      setCourts(await api.courts.schedule(selectedDateKey));
    } catch {
      setCourts([]);
    } finally {
      setLoadedKey(requestKey);
    }
  }, [enabled, requestKey, selectedDateKey]);

  useEffect(() => {
    if (!enabled) return;

    let active = true;
    api.courts.schedule(selectedDateKey)
      .then((data) => { if (active) { setCourts(data); setLoadedKey(requestKey); } })
      .catch(() => { if (active) { setCourts([]); setLoadedKey(requestKey); } });
    return () => { active = false; };
  }, [enabled, requestKey, selectedDateKey]);

  function clear() {
    setCourts([]);
    setLoadedKey("");
  }

  return { courts, loading, reload, clear };
}
