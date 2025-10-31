export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const toErrorResponse = (err: unknown) => {
  const includeDebug = process.env.NODE_ENV !== 'production';
  if (err instanceof AppError) {
    return {
      status: err.status,
      body: {
        error: {
          code: err.code,
          message: err.message,
          ...(includeDebug ? { debug: { stack: err.stack } } : {}),
        },
      },
    };
  }
  const unknown = err as any;
  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected error',
        ...(includeDebug
          ? { debug: { stack: unknown?.stack, message: unknown?.message, type: unknown?.name } }
          : {}),
      },
    },
  };
};


