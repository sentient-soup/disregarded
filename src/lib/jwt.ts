// JWT utilities using Web Crypto API
// Uses HMAC-SHA256 for signing

// JWT_SECRET is required in production
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[jwt] FATAL: JWT_SECRET environment variable is required");
  process.exit(1);
}

// JWT expiry in seconds (default: 24 hours)
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || "86400", 10);

console.log(`[jwt] Token expiry: ${JWT_EXPIRY} seconds (${(JWT_EXPIRY / 3600).toFixed(1)} hours)`);

interface JWTPayload {
  userId: number;
  username: string;
  iat: number;
  exp: number;
}

// Convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert Uint8Array to base64url
function uint8ArrayToBase64Url(arr: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...arr));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// Convert base64url to Uint8Array
function base64UrlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Get crypto key for HMAC
async function getCryptoKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    stringToUint8Array(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

// Sign data with HMAC-SHA256
async function sign(data: string): Promise<string> {
  const key = await getCryptoKey();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    stringToUint8Array(data)
  );
  return uint8ArrayToBase64Url(new Uint8Array(signature));
}

// Verify HMAC-SHA256 signature
async function verify(data: string, signature: string): Promise<boolean> {
  const key = await getCryptoKey();
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToUint8Array(signature),
    stringToUint8Array(data)
  );
}

// Create JWT token
export async function createToken(userId: number, username: string): Promise<string> {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const payload: JWTPayload = {
    userId,
    username,
    iat: now,
    exp: now + JWT_EXPIRY,
  };

  const headerB64 = uint8ArrayToBase64Url(
    stringToUint8Array(JSON.stringify(header))
  );
  const payloadB64 = uint8ArrayToBase64Url(
    stringToUint8Array(JSON.stringify(payload))
  );

  const dataToSign = `${headerB64}.${payloadB64}`;
  const signature = await sign(dataToSign);

  return `${dataToSign}.${signature}`;
}

// Verify and decode JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signature] = parts;
    const dataToVerify = `${headerB64}.${payloadB64}`;

    const isValid = await verify(dataToVerify, signature!);
    if (!isValid) {
      return null;
    }

    const payloadJson = new TextDecoder().decode(
      base64UrlToUint8Array(payloadB64!)
    );
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Extract token from Authorization header
export function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  if (!authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
