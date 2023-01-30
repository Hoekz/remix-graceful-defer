import { createContext, useContext } from 'react';

export const JSDetectionContext = createContext('');

export function DetectJavaScript() {
  const sessionId = useContext(JSDetectionContext);

  if (!sessionId) {
    return null;
  }

  return (
    <script
      id="remix-enable-js"
      data-session={sessionId}
      lang='javascript'
      dangerouslySetInnerHTML={{ __html: `fetch('/enable-js?s=${sessionId}')` }}
    />
  );
}
