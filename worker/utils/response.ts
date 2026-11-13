import type { ApiResponse } from '../types';

export function json<T>(data: T, status = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    data,
    error: null,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function error(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response {
  const body: ApiResponse = {
    success: false,
    data: null,
    error: { code, message, details },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export function unauthorized(message = 'Unauthorized'): Response {
  return error('UNAUTHORIZED', message, 401);
}

export function forbidden(message = 'Forbidden'): Response {
  return error('FORBIDDEN', message, 403);
}

export function notFound(message = 'Not found'): Response {
  return error('NOT_FOUND', message, 404);
}

export function serverError(message = 'Internal server error'): Response {
  return error('INTERNAL_ERROR', message, 500);
}
