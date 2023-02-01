import { PassThrough } from "stream";
import type { EntryContext, HandleDataRequestFunction } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { jsSession } from './cookies';
import { JSDetectionContext } from './utils/DetectJavaScript';
import { createSession, waitForSession } from './utils/session';
import { BlockablePassThrough } from './blockable-defer/BlockablePassThrough';
import { BlockUntilComplete, HidePlaceholders, ReplacePlaceholders } from '../deferrable/strategies';
import { DeferrableSession, FileBasedPersistence, fromCookie, toCookie } from '../deferrable';

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
    : handleDeferrableRequest(
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
    const start = Date.now();

    const body = new BlockablePassThrough(session, !deferrable);

    if (!session) {
      await createSession(body.id);
      responseHeaders.set('Set-Cookie', await jsSession.serialize(`${body.id}:false`));
    }

    let sessionWatcher: { promise: Promise<void>, cancel: () => void };
    if (!deferrable) {
      sessionWatcher = waitForSession(body.id);
      sessionWatcher.promise.then(() => {
        body.unblock();
      });
    }

    const app = (
      <JSDetectionContext.Provider value={{ session: body.id ?? '', deferrable: deferrable ?? '' }}>
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

        pipe(body);
      },
      onAllReady() {
        console.log(`All ready after ${Date.now() - start}ms`);
        sessionWatcher?.cancel();
      },
      onShellError(err: unknown) {
        reject(err);
      },
      onError(error: unknown) {
        didError = true;
        sessionWatcher?.cancel();
        body.unblock();
        console.error(error);
      },
    });

    setTimeout(abort, ABORT_DELAY);
  });
}

const getSession = fromCookie;
const setSession = toCookie;
const Persistence = FileBasedPersistence;
const Strategy = HidePlaceholders;

function handleDeferrableRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise(async (resolve, reject) => {
    let didError = false;
    const session = getSession(request);
    const persistor = new Persistence();

    const respond = () => resolve(
      setSession(session, new Response(strategy, {
        headers: responseHeaders,
        status: didError ? 500 : responseStatusCode,
      }))
    );

    const { pipe, abort } = renderToPipeableStream(<RemixServer context={remixContext} url={request.url} />, {
      onShellReady() {
        responseHeaders.set("Content-Type", "text/html");
        strategy.onReady();
      },
      onAllReady() {
        strategy.onComplete();
      },
      onShellError(err: unknown) {
        reject(err);
      },
      onError(error: unknown) {
        strategy.onError(error);
        console.error(error);
      },
    });

    const strategy = new Strategy(session, persistor, pipe, respond);

    setTimeout(abort, ABORT_DELAY);
  });
}

export const handleDataRequest: HandleDataRequestFunction = async (res, { request }) => {
  const url = new URL(request.url);

  if (url.pathname === DeferrableSession.api) {
    const session = getSession(request);
    const persistor = new Persistence();
    await persistor.destroy(session);
    session.deferrable = true;
    return setSession(session);
  }

  return res;
};
