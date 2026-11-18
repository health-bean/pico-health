"use client";

import { useEffect, useState } from "react";

/**
 * True once the page has scrolled past `offset` px. Bars stay clear over the
 * cream at the top of a screen and turn solid once content slides under them,
 * so nothing shows through as a smudge.
 */
export function useScrolled(offset = 4): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}
