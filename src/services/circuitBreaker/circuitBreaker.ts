type State = "CLOSED" | "OPEN" | "HALF_OPEN";

class CircuitBreaker {
  private failureThreshold: number;
  private recoveryTimeout: number;
  private successThreshold: number;
  private failures: number;
  private state: State;
  private lastFailureTime: number | null;
  private successes: number;

  constructor(
    failureThreshold: number,
    recoveryTimeout: number,
    successThreshold: number
  ) {
    this.failureThreshold = failureThreshold;
    this.recoveryTimeout = recoveryTimeout;
    this.successThreshold = successThreshold;
    this.failures = 0;
    this.state = "CLOSED";
    this.lastFailureTime = null;
    this.successes = 0;
  }

  private moveToState(newState: State) {
    this.state = newState;
    if (newState === "CLOSED") {
      this.failures = 0;
      this.successes = 0;
    }
  }
  async call<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (
        this.lastFailureTime &&
        Date.now() - this.lastFailureTime > this.recoveryTimeout
      ) {
        this.moveToState("HALF_OPEN");
      } else {
        throw new Error("Circuit is open");
      }
    }

    try {
      const result = await action();
      if (this.state === "HALF_OPEN") {
        this.successes++;
        if (this.successes >= this.successThreshold) {
          this.moveToState("CLOSED");
        }
      }
      return result;
    } catch (error) {
      this.failures++;
      if (this.failures >= this.failureThreshold) {
        this.moveToState("OPEN");
        this.lastFailureTime = Date.now();
      }
      throw error;
    }
  }
}

export default CircuitBreaker;
