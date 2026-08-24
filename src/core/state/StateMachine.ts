export class StateMachine<TState extends string> {
  constructor(
    private currentState: TState,
    private readonly transitions: Readonly<Record<TState, readonly TState[]>>,
  ) {}

  get state(): TState {
    return this.currentState;
  }

  canTransition(next: TState): boolean {
    return this.transitions[this.currentState]?.includes(next) ?? false;
  }

  transition(next: TState): void {
    if (!this.canTransition(next)) {
      throw new Error(`Invalid state transition: ${this.currentState} → ${next}`);
    }
    this.currentState = next;
  }
}
