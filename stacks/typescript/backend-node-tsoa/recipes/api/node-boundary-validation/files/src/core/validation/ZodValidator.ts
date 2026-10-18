import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        next(new ValidationError('Invalid request body payload', formatted));
      } else {
        next(err);
      }
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const formatted = err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }));
        next(new ValidationError('Invalid query parameters', formatted));
      } else {
        next(err);
      }
    }
  };
}
