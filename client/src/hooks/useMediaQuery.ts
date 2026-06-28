import { useState, useEffect } from "react";

// Presentational helper: tracks a CSS media query so a component can be rendered
// in exactly one place (e.g. static aside vs. mobile drawer) without mounting it
// twice. Initialized synchronously to avoid a layout flash on first paint.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
