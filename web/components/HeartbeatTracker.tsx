"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function HeartbeatTracker() {
  const { user } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!user?.telegram_id) return;

    const ping = () => {
      fetch("/api/admin/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: user.telegram_id, path: pathname }),
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [user?.telegram_id, pathname]);

  return null;
}
