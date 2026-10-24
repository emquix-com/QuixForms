export interface Turnstile {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
let pending: Promise<Turnstile> | undefined;
export function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (pending) return pending;
  pending = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    const timer = setTimeout(() => {
      script.remove();
      pending = undefined;
      reject(new Error("Bot check timed out. Reload to retry."));
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else {
        pending = undefined;
        reject(new Error("Bot check unavailable."));
      }
    };
    script.onerror = () => {
      clearTimeout(timer);
      script.remove();
      pending = undefined;
      reject(new Error("Bot check unavailable. Reload to retry."));
    };
    document.head.append(script);
  });
  return pending;
}
