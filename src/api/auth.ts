import { userQueries } from "../db";
import { createToken } from "../lib/jwt";

// Registration toggle - set to "false" to disable new signups
const REGISTRATION_ENABLED = process.env.REGISTRATION_ENABLED !== "false";

interface RegisterRequest {
  username: string;
  password: string;
}

interface LoginRequest {
  username: string;
  password: string;
}

// Validate username (alphanumeric, 3-20 chars)
function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// Validate password (min 6 chars)
function isValidPassword(password: string): boolean {
  return password.length >= 6;
}

export async function register(req: Request): Promise<Response> {
  try {
    // Check if registration is enabled
    if (!REGISTRATION_ENABLED) {
      return Response.json(
        { error: "Registration is currently disabled" },
        { status: 403 }
      );
    }

    const body: RegisterRequest = await req.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    if (!isValidUsername(username)) {
      return Response.json(
        { error: "Username must be 3-20 alphanumeric characters or underscores" },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return Response.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check if username exists
    const existingUser = userQueries.findByUsername.get(username);
    if (existingUser) {
      return Response.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Hash password using Bun's built-in argon2id
    const passwordHash = await Bun.password.hash(password, {
      algorithm: "argon2id",
      memoryCost: 65536,
      timeCost: 2,
    });

    // Create user
    const user = userQueries.create.get(username, passwordHash);
    if (!user) {
      return Response.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Generate token
    const token = await createToken(user.id, user.username);

    return Response.json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function login(req: Request): Promise<Response> {
  try {
    const body: LoginRequest = await req.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return Response.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = userQueries.findByUsername.get(username);
    if (!user) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await Bun.password.verify(password, user.password_hash);
    if (!isValid) {
      return Response.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Generate token
    const token = await createToken(user.id, user.username);

    return Response.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
