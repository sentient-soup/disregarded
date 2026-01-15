import { verifyToken, extractToken } from "../lib/jwt";

export interface AuthenticatedRequest extends Request {
  userId: number;
  username: string;
}

export type RouteHandler = (req: Request) => Promise<Response> | Response;
export type AuthenticatedRouteHandler = (req: AuthenticatedRequest) => Promise<Response> | Response;

// Middleware to require authentication
export function requireAuth(handler: AuthenticatedRouteHandler): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const authHeader = req.headers.get("Authorization");
    const token = extractToken(authHeader);

    if (!token) {
      return Response.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return Response.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Extend request with user info
    const authenticatedReq = req as AuthenticatedRequest;
    authenticatedReq.userId = payload.userId;
    authenticatedReq.username = payload.username;

    return handler(authenticatedReq);
  };
}

// Optional auth - adds user info if token present, but doesn't require it
export function optionalAuth(handler: (req: Request & { userId?: number; username?: string }) => Promise<Response> | Response): RouteHandler {
  return async (req: Request): Promise<Response> => {
    const authHeader = req.headers.get("Authorization");
    const token = extractToken(authHeader);

    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        (req as AuthenticatedRequest).userId = payload.userId;
        (req as AuthenticatedRequest).username = payload.username;
      }
    }

    return handler(req);
  };
}
