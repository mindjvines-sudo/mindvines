"use client";

import { useEffect, useRef } from "react";

/**
 * Closes a popover when the user clicks outside `ref` or presses Escape,
 * returning focus to the trigger on Escape.
 */
export function useDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      onClose();
      ref.current?.querySelector<HTMLElement>("[data-popover-trigger]")?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return ref;
}
