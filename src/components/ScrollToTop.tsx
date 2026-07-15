import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  // Initial mount: set scroll restoration to manual (no DOM read/write that causes reflow)
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    // Pin scroll to top for the first ~600ms to defeat:
    // - lazy/Suspense content growing the page after initial paint
    // - autoFocus inputs that scroll their element into view
    // - browser scroll restoration on slow reflows
    let cancelled = false;
    const pin = () => {
      if (cancelled) return;
      window.scrollTo(0, 0);
    };
    requestAnimationFrame(pin);
    const timeouts = [0, 50, 150, 300, 600].map((t) =>
      window.setTimeout(pin, t)
    );
    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Route changes: smooth scroll (but skip the very first render).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Use requestAnimationFrame to prevent forced reflow
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [pathname]);

  return null;
};

