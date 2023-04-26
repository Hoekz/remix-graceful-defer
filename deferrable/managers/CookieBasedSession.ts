import type { SessionManager } from '../Manager';
import type { SessionPersistence } from '../Persistence';
import { DeferrableSession } from '../Session';

const genId = () => Math.floor(Math.random() * 0xFFFFFFFFFFFF).toString(16);

export class CookieBasedSession implements SessionManager {
  constructor(
    public name = 'remix-deferrable',
    public api = '/' + name,
  ) {}

  matches(req: Request) {
    const url = new URL(req.url);

    return url.pathname === this.api;
  }

  script(session: DeferrableSession) {
    if (session.deferrable !== undefined) return '';
  
    return `<script lang="javascript">fetch('${this.api}?_data=routes%2F$');document.currentScript.remove();</script>`;
  }

  getSession(req: Request, persistor: SessionPersistence): DeferrableSession {
    const cookies = req.headers.get('cookie') ?? '';
    const at = cookies.indexOf(`${this.name}=`);
  
    if (at === -1) {
      return new DeferrableSession(genId(), undefined, this, persistor);
    }
  
    const cookie = cookies.substring(at + this.name.length + 1).split(';')[0];
    return new DeferrableSession(cookie.split(':')[0], cookie.split(':')[1] === 'true', this, persistor);
  }

  setSession(session: DeferrableSession, res?: Response) {
    const cookie = `${this.name}=${session.id}:${session.deferrable ?? false}; Path=/; HttpOnly; SameSite=Lax`;

    res = res ?? new Response(null, { status: 200 });
    res.headers.set('Set-Cookie', cookie);
    return res;
  }
}
