"use client";

import { useEffect } from "react";

/**
 * Brand treatments for review. `?brand=deck|warm|paper` stamps the choice on
 * <html> and remembers it, so the whole app can be flipped between visual
 * directions with real data. `?brand=off` clears it. Nothing renders; the
 * treatments live in globals.css.
 */
export function BrandPreview() {
  useEffect(() => {
    const root = document.documentElement;
    const param = new URLSearchParams(window.location.search).get("brand");

    if (param) {
      try {
        if (param === "off") localStorage.removeItem("pico:brand");
        else localStorage.setItem("pico:brand", param);
      } catch {
        // storage unavailable: the param still applies for this page
      }
    }

    let brand = param;
    if (!brand) {
      try {
        brand = localStorage.getItem("pico:brand");
      } catch {
        brand = null;
      }
    }

    if (brand && brand !== "off") root.setAttribute("data-brand", brand);
    else root.removeAttribute("data-brand");
  }, []);

  return null;
}
