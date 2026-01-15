import { essayQueries, userQueries, type Essay } from "../db";
import type { AuthenticatedRequest } from "./middleware";

// Maximum essay content length (default: 500KB)
const MAX_ESSAY_LENGTH = parseInt(process.env.MAX_ESSAY_LENGTH || "500000", 10);

interface CreateEssayRequest {
  title: string;
  content: string;
}

interface UpdateEssayRequest {
  title?: string;
  content?: string;
}

// Get all published essays (public)
export async function getPublishedEssays(_req: Request): Promise<Response> {
  try {
    const essays = essayQueries.findPublished.all();
    
    // Add author info to each essay
    const essaysWithAuthors = essays.map((essay) => {
      const user = userQueries.findById.get(essay.user_id);
      return {
        ...essay,
        author: user?.username || "Unknown",
      };
    });

    return Response.json({ essays: essaysWithAuthors });
  } catch (error) {
    console.error("Get published essays error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user's essays (authenticated)
export async function getUserEssays(req: AuthenticatedRequest): Promise<Response> {
  try {
    const essays = essayQueries.findByUserId.all(req.userId);
    return Response.json({ essays });
  } catch (error) {
    console.error("Get user essays error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get single essay
export async function getEssay(req: Request & { params: { id: string }; userId?: number }): Promise<Response> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "Invalid essay ID" }, { status: 400 });
    }

    const essay = essayQueries.findById.get(id);
    if (!essay) {
      return Response.json({ error: "Essay not found" }, { status: 404 });
    }

    // Check access: published essays are public, drafts only for owner
    if (essay.status === "draft" && essay.user_id !== req.userId) {
      return Response.json({ error: "Essay not found" }, { status: 404 });
    }

    // Add author info
    const user = userQueries.findById.get(essay.user_id);
    return Response.json({
      essay: {
        ...essay,
        author: user?.username || "Unknown",
      },
    });
  } catch (error) {
    console.error("Get essay error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Create essay (authenticated)
export async function createEssay(req: AuthenticatedRequest): Promise<Response> {
  try {
    const body: CreateEssayRequest = await req.json();
    const { title, content } = body;

    if (!title || title.trim().length === 0) {
      return Response.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!content) {
      return Response.json(
        { error: "Content is required" },
        { status: 400 }
      );
    }

    if (content.length > MAX_ESSAY_LENGTH) {
      return Response.json(
        { error: `Essay content exceeds maximum length of ${MAX_ESSAY_LENGTH} characters` },
        { status: 400 }
      );
    }

    const essay = essayQueries.create.get(req.userId, title.trim(), content);
    if (!essay) {
      return Response.json(
        { error: "Failed to create essay" },
        { status: 500 }
      );
    }

    return Response.json({
      message: "Essay created",
      essay,
    }, { status: 201 });
  } catch (error) {
    console.error("Create essay error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update essay (authenticated)
export async function updateEssay(req: AuthenticatedRequest & { params: { id: string } }): Promise<Response> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "Invalid essay ID" }, { status: 400 });
    }

    // Check ownership
    const existing = essayQueries.findById.get(id);
    if (!existing) {
      return Response.json({ error: "Essay not found" }, { status: 404 });
    }
    if (existing.user_id !== req.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body: UpdateEssayRequest = await req.json();
    const title = body.title?.trim() || existing.title;
    const content = body.content ?? existing.content;

    if (title.length === 0) {
      return Response.json({ error: "Title cannot be empty" }, { status: 400 });
    }

    if (content.length > MAX_ESSAY_LENGTH) {
      return Response.json(
        { error: `Essay content exceeds maximum length of ${MAX_ESSAY_LENGTH} characters` },
        { status: 400 }
      );
    }

    const essay = essayQueries.update.get(title, content, id, req.userId);
    if (!essay) {
      return Response.json(
        { error: "Failed to update essay" },
        { status: 500 }
      );
    }

    return Response.json({
      message: "Essay updated",
      essay,
    });
  } catch (error) {
    console.error("Update essay error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete essay (authenticated)
export async function deleteEssay(req: AuthenticatedRequest & { params: { id: string } }): Promise<Response> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "Invalid essay ID" }, { status: 400 });
    }

    // Check ownership
    const existing = essayQueries.findById.get(id);
    if (!existing) {
      return Response.json({ error: "Essay not found" }, { status: 404 });
    }
    if (existing.user_id !== req.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    essayQueries.delete.run(id, req.userId);

    return Response.json({ message: "Essay deleted" });
  } catch (error) {
    console.error("Delete essay error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Publish essay (authenticated)
export async function publishEssay(req: AuthenticatedRequest & { params: { id: string } }): Promise<Response> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "Invalid essay ID" }, { status: 400 });
    }

    // Check ownership
    const existing = essayQueries.findById.get(id);
    if (!existing) {
      return Response.json({ error: "Essay not found" }, { status: 404 });
    }
    if (existing.user_id !== req.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const essay = essayQueries.updateStatus.get("published", id, req.userId);
    if (!essay) {
      return Response.json(
        { error: "Failed to publish essay" },
        { status: 500 }
      );
    }

    return Response.json({
      message: "Essay published",
      essay,
    });
  } catch (error) {
    console.error("Publish essay error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Unpublish essay (authenticated)
export async function unpublishEssay(req: AuthenticatedRequest & { params: { id: string } }): Promise<Response> {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return Response.json({ error: "Invalid essay ID" }, { status: 400 });
    }

    // Check ownership
    const existing = essayQueries.findById.get(id);
    if (!existing) {
      return Response.json({ error: "Essay not found" }, { status: 404 });
    }
    if (existing.user_id !== req.userId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const essay = essayQueries.updateStatus.get("draft", id, req.userId);
    if (!essay) {
      return Response.json(
        { error: "Failed to unpublish essay" },
        { status: 500 }
      );
    }

    return Response.json({
      message: "Essay unpublished",
      essay,
    });
  } catch (error) {
    console.error("Unpublish essay error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
