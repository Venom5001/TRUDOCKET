"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  isPro: boolean;
  success: boolean;
}

/**
 * After a Stripe checkout redirect (?success=1), polls via router.refresh()
 * until the server confirms Pro status or the 10-second cap is reached.
 * Renders a status banner; returns null when success=false.
 */
export function BillingSuccessPoller({ isPro, success }: Props) {
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countRef = useRef(0);
  const MAX_POLLS = 5; // 5 × 2 s = 10 s cap

  // Start a polling interval once on mount when we're in the success flow.
  useEffect(() => {
    if (!success || isPro || timedOut) return;

    intervalRef.current = setInterval(() => {
      countRef.current += 1;
      if (countRef.current >= MAX_POLLS) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setTimedOut(true);
        return;
      }
      router.refresh();
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop polling as soon as the server confirms Pro is active.
  useEffect(() => {
    if (isPro && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isPro]);

  if (!success) return null;

  if (isPro) {
    return (
      <div className="bg-green-950/40 border border-green-700/50 rounded-xl p-4 text-green-200 text-sm mb-6 flex items-center gap-2">
        <span className="text-green-400">✓</span>
        <span>Welcome to Pro! Your subscription is now active.</span>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="bg-yellow-950/30 border border-yellow-700/50 rounded-xl p-4 text-yellow-200 text-sm mb-6">
        Your payment was received. It may take a moment for your plan to
        update — refresh the page if this message persists.
      </div>
    );
  }

  return (
    <div className="bg-indigo-950/30 border border-indigo-700/50 rounded-xl p-4 text-indigo-200 text-sm mb-6 flex items-center gap-3">
      <span className="animate-spin inline-block select-none">↻</span>
      <span>Activating your Pro subscription…</span>
    </div>
  );
}
