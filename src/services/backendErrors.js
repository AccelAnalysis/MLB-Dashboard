export class BackendError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'BackendError';
    this.code = options.code || 'BACKEND_ERROR';
    this.operation = options.operation || '';
    this.provider = options.provider || '';
    this.recoverable = options.recoverable !== false;
    this.cause = options.cause;
    this.details = options.details || null;
  }
}

export const normalizeBackendError = (error, context = {}) => {
  if (error instanceof BackendError) return error;

  const message = error?.message || context.fallbackMessage || 'The shared backend operation failed.';
  const code = error?.code || context.code || 'BACKEND_ERROR';

  return new BackendError(message, {
    code,
    operation: context.operation,
    provider: context.provider,
    recoverable: context.recoverable,
    cause: error,
    details: error?.details || error?.hint || null,
  });
};

export const backendResult = (data, extra = {}) => ({
  ok: true,
  data,
  error: null,
  ...extra,
});

export const backendFailure = (error, extra = {}) => ({
  ok: false,
  data: null,
  error: normalizeBackendError(error, extra),
  ...extra,
});
