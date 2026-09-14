export class UpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpstreamError";
  }
}

export class UpstreamTimeoutError extends UpstreamError {
  constructor(path: string, timeoutMs: number) {
    super(`Upstream request to ${path} timed out after ${timeoutMs}ms`);
    this.name = "UpstreamTimeoutError";
  }
}

export class UpstreamHttpError extends UpstreamError {
  constructor(
    public readonly path: string,
    public readonly status: number
  ) {
    super(`Upstream request to ${path} failed with status ${status}`);
    this.name = "UpstreamHttpError";
  }
}

export class UpstreamInvalidResponseError extends UpstreamError {
  constructor(path: string, reason: string) {
    super(`Upstream response from ${path} is invalid: ${reason}`);
    this.name = "UpstreamInvalidResponseError";
  }
}

export class UpstreamValidationError extends UpstreamError {
  constructor(
    path: string,
    public readonly issues: string
  ) {
    super(`Upstream response from ${path} failed schema validation: ${issues}`);
    this.name = "UpstreamValidationError";
  }
}
