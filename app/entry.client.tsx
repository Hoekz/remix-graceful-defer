import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { JSDetectionContext } from './utils/DetectJavaScript';

function hydrate() {
  const session = document.getElementById('remix-enable-js')?.getAttribute('data-session') ?? '';
  const deferrable = document.getElementById('remix-enable-js')?.getAttribute('data-deferrable') ?? '';

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <JSDetectionContext.Provider value={{ session, deferrable }}>
          <RemixBrowser />
        </JSDetectionContext.Provider>
      </StrictMode>
    );
  });
}

if (typeof requestIdleCallback === "function") {
  requestIdleCallback(hydrate);
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  setTimeout(hydrate, 1);
}
