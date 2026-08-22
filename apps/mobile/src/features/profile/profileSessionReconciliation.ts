export type ProfileSessionState = "authenticated" | "guest" | "signed-out";

type Session = { user: { id: string } } | null;

export function startProfileSessionReconciliation({
  readSession,
  readOnboardingCompleted,
  subscribeSession,
  onState,
}: {
  readSession: () => Promise<Session>;
  readOnboardingCompleted: () => Promise<boolean>;
  subscribeSession: (listener: (session: Session) => void) => () => void;
  onState: (state: ProfileSessionState) => void;
}) {
  let mounted = true;
  let generation = 0;

  const reconcileSession = async (session: Session) => {
    const currentGeneration = ++generation;
    if (session) {
      if (mounted) onState("authenticated");
      return;
    }

    const guest = await readOnboardingCompleted().catch(() => false);
    if (mounted && generation === currentGeneration) {
      onState(guest ? "guest" : "signed-out");
    }
  };

  const unsubscribe = subscribeSession((session) => {
    void reconcileSession(session);
  });
  const hydrationGeneration = generation;
  void Promise.all([
    readSession().catch(() => null),
    readOnboardingCompleted().catch(() => false),
  ]).then(([session, guest]) => {
    if (mounted && generation === hydrationGeneration) {
      onState(session ? "authenticated" : guest ? "guest" : "signed-out");
    }
  });

  return () => {
    mounted = false;
    unsubscribe();
  };
}
