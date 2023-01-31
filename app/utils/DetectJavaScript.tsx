import { createContext, useContext } from 'react';

export const JSDetectionContext = createContext({ session: '', deferrable: '' });

export function DetectJavaScript() {
  const { session, deferrable } = useContext(JSDetectionContext);

  if (!session || deferrable) {
    return null;
  }

  return (
    <script
      id="remix-enable-js"
      data-session={session}
      data-deferrable={deferrable}
      lang='javascript'
      dangerouslySetInnerHTML={{ __html: `fetch('/enable-js?s=${session}')` }}
    />
  );
}
