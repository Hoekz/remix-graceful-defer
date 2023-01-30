import { createCookie } from '@remix-run/node';

export const jsSession = createCookie('js-enabled-session', {
  httpOnly: true,
  path: '/',
});
