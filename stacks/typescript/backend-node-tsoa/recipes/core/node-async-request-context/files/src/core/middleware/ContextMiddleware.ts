import { Request, Response, NextFunction } from 'express';
import { requestContextStorage, IRequestState } from '../context/RequestContext';

export const contextMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const correlationId = (req.headers['x-correlation-id'] as string) || (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const isTestLab = req.headers['x-is-test-lab'] === 'true';

  const initialState: IRequestState = {
    correlationId,
    isTestLab
  };

  return requestContextStorage.run(initialState, () => next());
};
