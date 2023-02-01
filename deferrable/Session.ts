export interface SessionManager {
  matches(req: Request): boolean;
  getSession(req: Request): DeferrableSession;
  setSession(session: DeferrableSession, res?: Response): Response;
  script(session: DeferrableSession): string;
}

export class DeferrableSession {
  constructor(
    public id: string,
    public deferrable: boolean | undefined,
    public manager: SessionManager
  ) {}

  get script() {
    if (this.deferrable !== undefined) return '';
    return this.manager.script(this);
  }
}
