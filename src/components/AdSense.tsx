import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

interface AdSenseProps {
  publisherId: string;
}

export function AdSense({ publisherId }: AdSenseProps) {
  useEffect(() => {
    if (!publisherId) return;
    const existing = document.querySelector(
      `script[src*="pagead2.googlesyndication.com"]`
    );
    if (existing) return;

    // Defer the AdSense script until the browser is idle so it never blocks
    // initial render, TBT, or LCP on the homepage.
    const loadScript = () => {
      const script = document.createElement("script");
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
      script.async = true;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
    };

    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(loadScript, { timeout: 4000 });
    } else {
      const id = setTimeout(loadScript, 4000);
      return () => clearTimeout(id);
    }
  }, [publisherId]);

  return null;
}

// Ad unit component for displaying ads
interface AdUnitProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  responsive?: boolean;
  className?: string;
}

export function AdUnit({ 
  slot, 
  format = "auto", 
  responsive = true,
  className = ""
}: AdUnitProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.adsbygoogle) {
        window.adsbygoogle.push({});
      }
    } catch (e) {
      console.error("AdSense error:", e);
    }
  }, []);

  return (
    <ins
      className={`adsbygoogle ${className}`}
      style={{ display: "block" }}
      data-ad-format={format}
      data-full-width-responsive={responsive ? "true" : "false"}
      {...(slot && { "data-ad-slot": slot })}
    />
  );
}
