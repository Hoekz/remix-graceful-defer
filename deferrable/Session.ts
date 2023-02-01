export class DeferrableSession {
  static api = '/remix-deferrable';

  constructor(public id: string, public deferrable?: boolean) {}

  get script() {
    if (this.deferrable !== undefined) return '';

    return `<script lang="javascript">fetch('${DeferrableSession.api}?_data=routes%2F$&s=${this.id}');document.currentScript.remove();</script>`;
  }
}

const genId = () => Math.floor(Math.random() * 0xFFFFFFFFFFFF).toString(16);
const cookieName = 'remix-deferrable';

export function fromCookie(req: Request) {
  const cookies = req.headers.get('cookie') ?? '';
  const at = cookies.indexOf(`${cookieName}=`);

  if (at === -1) {
    return new DeferrableSession(genId());
  }

  const cookie = cookies.substring(at + cookieName.length + 1).split(';')[0];
  return new DeferrableSession(cookie.split(':')[0], cookie.split(':')[1] === 'true');
}

export function toCookie(session: DeferrableSession, res?: Response) {
  const cookie = `${cookieName}=${session.id}:${session.deferrable ?? false}; Path=/; HttpOnly; SameSite=Lax`;

  res = res ?? new Response(null, { status: 200 });
  res.headers.set('Set-Cookie', cookie);
  return res;
}
