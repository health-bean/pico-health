"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshOnLaunch } from "@/lib/native/push";

/** In the phone app: refresh the reminder token and open the Log when a reminder is tapped. Renders nothing. */
export function NativePush() {
  const router = useRouter();
  useEffect(() => {
    void refreshOnLaunch((url) => router.push(url));
  }, [router]);
  return null;
}
