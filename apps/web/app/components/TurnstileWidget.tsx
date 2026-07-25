import { useEffect, useId, useRef } from "react";

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";

type TurnstileRenderOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();

  if (!turnstileScriptPromise) {
    turnstileScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        existingScript.addEventListener("error", () => reject(new Error("turnstile load failed")));
        return;
      }

      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("turnstile load failed"));
      document.head.appendChild(script);
    });
  }

  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  siteKey: string | null | undefined;
  onVerify: (token: string) => void;
};

export function TurnstileWidget({ siteKey, onVerify }: TurnstileWidgetProps) {
  const containerId = useId();
  const widgetIdRef = useRef<string | undefined>(undefined);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  useEffect(() => {
    if (!siteKey) return;

    let cancelled = false;

    loadTurnstileScript().then(() => {
      if (cancelled || !window.turnstile) return;

      const container = document.getElementById(containerId);
      if (!container) return;

      widgetIdRef.current = window.turnstile.render(container, {
        sitekey: siteKey,
        callback: (token) => onVerifyRef.current(token),
        "expired-callback": () => onVerifyRef.current(""),
        "error-callback": () => onVerifyRef.current(""),
      });
    });

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = undefined;
      }
    };
  }, [containerId, siteKey]);

  if (!siteKey) return null;

  return <div id={containerId} className="cf-turnstile" />;
}
