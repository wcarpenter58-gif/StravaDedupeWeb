import { z } from 'zod';
import { insertUserSchema } from './schema';

export const errorSchemas = {
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    status: {
      method: 'GET' as const,
      path: '/api/auth/status' as const,
      responses: {
        200: z.object({
          isAuthenticated: z.boolean(),
          user: z.object({
            stravaId: z.number().optional(),
            displayName: z.string().optional().nullable(),
          }).optional(),
        }),
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    }
  },
  activities: {
    scan: {
      method: 'GET' as const,
      path: '/api/activities/scan' as const,
      input: z.object({
        before: z.string().optional(), // ISO string
        after: z.string().optional(),  // ISO string
      }).optional(),
      responses: {
        200: z.object({
          scannedCount: z.number(),
          duplicatesFound: z.number(),
          groups: z.array(z.object({
            startTime: z.string(),
            durationDifference: z.number(),
            activities: z.array(z.any()),
          })),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/activities/:id' as const,
      responses: {
        200: z.object({ success: z.boolean() }),
        401: errorSchemas.unauthorized,
        403: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
