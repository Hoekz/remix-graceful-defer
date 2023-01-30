import { PassThrough } from "stream";
import type { EntryContext } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { jsSession } from './cookies';
import { DeferrablePassThrough } from './utils/deferrable-pass-through';
import { JSDetectionContext } from './utils/DetectJavaScript';
import { createSession, waitForSession } from './utils/session';

const ABORT_DELAY = 5000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return isbot(request.headers.get("user-agent"))
    ? handleBotRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      )
    : handleBrowserRequest(
        request,
        responseStatusCode,
        responseHeaders,
        remixContext
      );
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise((resolve, reject) => {
    let didError = false;

    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        onAllReady() {
          const body = new PassThrough();

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(body, {
              headers: responseHeaders,
              status: didError ? 500 : responseStatusCode,
            })
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          didError = true;

          console.error(error);
        },
      }
    );

    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise(async (resolve, reject) => {
    const [session, deferrable] = (await jsSession.parse(request.headers.get('cookie')) ?? '').split(':');
    let didError = false;
    let deferring = deferrable;
    let sent = false;

    const body = deferrable ? new PassThrough() : new DeferrablePassThrough(session);
    // const body = new DeferrablePassThrough(session);

    if (!session) {
      await createSession((body as DeferrablePassThrough).id);
      responseHeaders.set('Set-Cookie', await jsSession.serialize((body as DeferrablePassThrough).id));
    }

    let sessionWatcher: { promise: Promise<void>, cancel: () => void };
    if (!deferrable) {
      sessionWatcher = waitForSession((body as DeferrablePassThrough).id);
      sessionWatcher.promise.then(() => {
        if (!deferring && !sent) {
          deferring = true;
          pipe(body);
        }
      });
    }

    const app = (
      <JSDetectionContext.Provider value={(body as DeferrablePassThrough).id ?? ''}>
        <RemixServer context={remixContext} url={request.url} />
      </JSDetectionContext.Provider>
    );

    const { pipe, abort } = renderToPipeableStream(app, {
      onShellReady() {
        responseHeaders.set("Content-Type", "text/html");
        
        resolve(
          new Response(body, {
            headers: responseHeaders,
            status: didError ? 500 : responseStatusCode,
          })
        );

        if (deferring) {
          sent = true;
          pipe(body);
        } else {
          (body as DeferrablePassThrough).prewrite();
        }
      },
      onAllReady() {
        if (!deferring) {
          sent = true;
          sessionWatcher?.cancel();
          pipe(body);
        }
      },
      onShellError(err: unknown) {
        reject(err);
      },
      onError(error: unknown) {
        didError = true;
        
        console.error(error);
      },
    });

    setTimeout(abort, ABORT_DELAY);
  });
}
