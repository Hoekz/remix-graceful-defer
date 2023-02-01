import { PassThrough } from "stream";
import type { EntryContext, HandleDataRequestFunction } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import isbot from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { BlockUntilComplete, HidePlaceholders, ReplacePlaceholders } from '../deferrable/strategies';
import { FileBasedPersistence } from '../deferrable/persistors';
import { CookieBasedSession } from '../deferrable/managers';

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

const SessionImpl = CookieBasedSession;
const PersistenceImpl = FileBasedPersistence;
const StrategyImpl = {
  block: BlockUntilComplete,
  replace: ReplacePlaceholders,
  hide: HidePlaceholders,
}[process.env.DEFER_STRATEGY as string] ?? BlockUntilComplete;

const sessionManager = new SessionImpl();
const sessionPersistor = new PersistenceImpl();

function handleDeferrableRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext
) {
  return new Promise(async (resolve, reject) => {
    let didError = false;
    const session = sessionManager.getSession(request);

    const respond = () => resolve(
      sessionManager.setSession(session, new Response(strategy, {
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

    const strategy = new StrategyImpl(session, sessionPersistor, pipe, respond);

    setTimeout(abort, ABORT_DELAY);
  });
}

export const handleDataRequest: HandleDataRequestFunction = async (res, { request }) => {
  if (sessionManager.matches(request)) {
    const session = sessionManager.getSession(request);
    await sessionPersistor.destroy(session);
    session.deferrable = true;
    return sessionManager.setSession(session);
  }

  return res;
};
