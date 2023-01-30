import { json, type LoaderFunction } from 'react-router';
import { jsSession } from '../cookies';
import { markSession } from '../utils/session';

export const loader: LoaderFunction = async ({ request }) => {
  const sessionId = (new URL(request.url)).searchParams.get('s');

  if (!sessionId) {
    return json({ error: 'must specify a session' }, 400);
  }

  if (!await markSession(sessionId)) {
    return json({ error: 'unrecognized session' }, 400);
  }

  const cookie = await jsSession.serialize(`${sessionId}:enabled`);

  return json({ jsEnabled: true }, { headers: { 'Set-Cookie': cookie } });
};
