import { Request, Response, NextFunction, RequestHandler } from 'express';
import { FeatureFlags } from '../config/FeatureFlags';
import { Logger } from '../logger/Logger';

export interface StranglerRouteOptions {
  flagKey: string;
  legacyHandler: RequestHandler;
  modernHandler: RequestHandler;
  shadowMode?: boolean;
  routeName?: string;
}

/**
 * Creates a Branch-by-Abstraction route handler that safely toggles between legacy
 * and modern handlers based on dynamic feature flags.
 */
export function createStranglerRoute(options: StranglerRouteOptions): RequestHandler {
  const routeLabel = options.routeName || options.flagKey;

  return (req: Request, res: Response, next: NextFunction) => {
    const isModernEnabled = FeatureFlags.isEnabled(options.flagKey);

    if (isModernEnabled) {
      Logger.debug(`[StranglerRouter] Executing modern V2 handler for '${routeLabel}'`, {
        flag: options.flagKey,
        path: req.originalUrl
      });
      return options.modernHandler(req, res, next);
    }

    // Shadow execution mode: run modern handler in background for comparison
    if (options.shadowMode && process.env.NODE_ENV !== 'production') {
      executeShadowComparison(req, options.modernHandler, routeLabel);
    }

    Logger.debug(`[StranglerRouter] Falling back to legacy V1 handler for '${routeLabel}'`, {
      flag: options.flagKey,
      path: req.originalUrl
    });
    return options.legacyHandler(req, res, next);
  };
}

/**
 * Executes modern handler in shadow mode to detect divergence without breaking client requests.
 */
function executeShadowComparison(req: Request, modernHandler: RequestHandler, routeLabel: string): void {
  setImmediate(async () => {
    try {
      const mockRes: any = {
        statusCode: 200,
        headers: {},
        body: null,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(data: any) {
          this.body = data;
          return this;
        },
        setHeader(name: string, value: string) {
          this.headers[name] = value;
          return this;
        }
      };

      await modernHandler(req, mockRes, () => {});
      Logger.debug(`[StranglerShadow] Shadow execution passed for '${routeLabel}'`, {
        shadowStatus: mockRes.statusCode
      });
    } catch (shadowErr: any) {
      Logger.warn(`[StranglerShadow] Shadow execution diverged for '${routeLabel}': ${shadowErr.message}`, {
        error: shadowErr
      });
    }
  });
}
