import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { JSDetectionContext } from './utils/DetectJavaScript';

function hydrate() {
  const sessionId = document.getElementById('remix-enable-js')?.getAttribute('data-session') ?? '';

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <JSDetectionContext.Provider value={sessionId}>
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
