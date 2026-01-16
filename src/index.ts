import { serve } from "bun";
import { register, login } from "./api/auth";

// In production, serve pre-built files from dist/
// In development, use runtime bundling
const isProduction = process.env.NODE_ENV === "production";
const index = isProduction ? null : (await import("./index.html")).default;
import {
  getPublishedEssays,
  getUserEssays,
  getEssay,
  createEssay,
  updateEssay,
  deleteEssay,
  publishEssay,
  unpublishEssay,
} from "./api/essays";
import { requireAuth, optionalAuth } from "./api/middleware";

// Server port (default: 3000)
const PORT = parseInt(process.env.PORT || "3000", 10);

// Simple router helper
function matchRoute(pathname: string, pattern: string): Record<string, string> | null {
  const patternParts = pattern.split("/");
  const pathParts = pathname.split("/");

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]!;
    const pathPart = pathParts[i]!;

    if (patternPart.startsWith(":")) {
      params[patternPart.slice(1)] = pathPart;
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

const server = serve({
  port: PORT,

  // Use routes for static/HTML serving with HMR (dev mode only)
  routes: isProduction ? {} : {
    "/": index,
  },

  // Use fetch for API routing and static file serving
  async fetch(req) {
    const url = new URL(req.url);
    const { pathname } = url;

    // In production, serve static files from dist/
    if (isProduction) {
      // Serve static assets (JS, CSS, maps, etc.)
      if (pathname.match(/\.(js|css|map|ico|svg|png|jpg|jpeg|gif|woff|woff2|ttf|eot)$/)) {
        const filePath = `dist${pathname}`;
        const file = Bun.file(filePath);
        if (await file.exists()) {
          return new Response(file);
        }
      }
    }

    const method = req.method;

    // Serve dictionary files for spell checking
    if (pathname.startsWith("/dictionaries/")) {
      const filename = pathname.replace("/dictionaries/", "");
      const dictPath = `node_modules/typo-js/dictionaries/en_US/${filename}`;
      const file = Bun.file(dictPath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "text/plain" },
        });
      }
      return new Response("Dictionary not found", { status: 404 });
    }

    // API Routes
    if (pathname.startsWith("/api/")) {
      // Auth routes
      if (pathname === "/api/auth/register" && method === "POST") {
        return register(req);
      }
      if (pathname === "/api/auth/login" && method === "POST") {
        return login(req);
      }

      // Public essays
      if (pathname === "/api/essays/public" && method === "GET") {
        return getPublishedEssays(req);
      }

      // Essays list/create
      if (pathname === "/api/essays" && method === "GET") {
        return requireAuth(getUserEssays)(req);
      }
      if (pathname === "/api/essays" && method === "POST") {
        return requireAuth(createEssay)(req);
      }

      // Essay by ID routes - check for publish/unpublish first (more specific)
      let params = matchRoute(pathname, "/api/essays/:id/publish");
      if (params && method === "PUT") {
        (req as any).params = params;
        return requireAuth(publishEssay as any)(req);
      }

      params = matchRoute(pathname, "/api/essays/:id/unpublish");
      if (params && method === "PUT") {
        (req as any).params = params;
        return requireAuth(unpublishEssay as any)(req);
      }

      // Single essay operations
      params = matchRoute(pathname, "/api/essays/:id");
      if (params) {
        (req as any).params = params;
        if (method === "GET") {
          return optionalAuth(getEssay as any)(req);
        }
        if (method === "PUT") {
          return requireAuth(updateEssay as any)(req);
        }
        if (method === "DELETE") {
          return requireAuth(deleteEssay as any)(req);
        }
      }

      // API 404
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    // For SPA routing - serve index.html for all non-API routes
    if (isProduction) {
      // Production: serve pre-built HTML
      return new Response(Bun.file("dist/index.html"));
    } else {
      // Development: use the bundled index from routes
      // The 'index' import is already a bundled response handler
      return index;
    }
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`Server running at ${server.url}`);
