export class DeferrableSession {
  static api = '/remix-deferrable';

  constructor(public id: string, public deferrable?: boolean) {}

  get script() {
    if (this.deferrable !== undefined) return '';

    return `
      <script lang="javascript">
        fetch('${DeferrableSession.api}?s=${this.id}');
        document.currentScript.remove();
      </script>
    `;
  }
}

export function fromClient(document: Document) {
  const ref = document.getElementById(DeferrableSession.namespace);

  return new DeferrableSession(ref?.getAttribute('data-id') ?? '', true);
}

const genId = () => Math.floor(Math.random() * 0xFFFFFFFFFFFF).toString(16);

export function fromCookie(req: Request, name = 'remix-deferrable') {
  const cookies = req.headers.get('cookie') ?? '';
  const at = cookies.indexOf(`${name}=`);

  if (at === -1) {
    return new DeferrableSession(genId(), false);
  }

  const cookie = cookies.substring(at + 1).split(';')[0];
  return new DeferrableSession(cookie.split(':')[0], cookie.split(':')[1] === 'true');
}

export function toCookie(session: DeferrableSession, res: Response, name = 'remix-deferrable') {
  res.headers.set('Set-Cookie', `${name}=${session.id}:${session.deferrable}; Path=/; HttpOnly; SameSite=Lax`);
  return res;
}
