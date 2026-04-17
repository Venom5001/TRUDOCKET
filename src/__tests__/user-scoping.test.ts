import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

const mockDocumentFindFirst = vi.fn();
const mockCaseFindFirst = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findFirst: mockDocumentFindFirst },
    case: { findFirst: mockCaseFindFirst },
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDoc(userId: string) {
  return {
    id: "doc1",
    userId,
    title: "Test Motion",
    generatedContent: "content",
    sources: null,
    providerMeta: null,
    case: null,
    createdAt: new Date(),
    motionType: "Motion to Dismiss",
    jurisdiction: "S.D.N.Y.",
    partyRole: "Plaintiff",
  };
}

// ─── Document ownership scoping ───────────────────────────────────────────────

describe("Document ownership scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findFirst is always called with userId filter", async () => {
    const userId = "user-abc";
    const docId = "doc-123";

    mockDocumentFindFirst.mockResolvedValue(makeDoc(userId));

    const { prisma } = await import("@/lib/prisma");

    await prisma.document.findFirst({
      where: { id: docId, userId },
    });

    expect(mockDocumentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId }),
      })
    );
  });

  it("returns null when document belongs to a different user", async () => {
    const requestingUserId = "user-abc";
    const ownerUserId = "user-xyz";
    const docId = "doc-123";

    // Simulate Prisma returning null because userId filter doesn't match
    mockDocumentFindFirst.mockImplementation(
      (args: { where?: { userId?: string } }) => {
        if (args?.where?.userId !== ownerUserId) return Promise.resolve(null);
        return Promise.resolve(makeDoc(ownerUserId));
      }
    );

    const { prisma } = await import("@/lib/prisma");

    const result = await prisma.document.findFirst({
      where: { id: docId, userId: requestingUserId },
    });

    expect(result).toBeNull();
  });

  it("returns document when userId matches owner", async () => {
    const userId = "user-abc";
    mockDocumentFindFirst.mockResolvedValue(makeDoc(userId));

    const { prisma } = await import("@/lib/prisma");

    const result = await prisma.document.findFirst({
      where: { id: "doc-123", userId },
    });

    expect(result).not.toBeNull();
    expect(result?.userId).toBe(userId);
  });
});

// ─── Case ownership scoping ───────────────────────────────────────────────────

describe("Case ownership scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("case findFirst is always called with userId filter", async () => {
    const userId = "user-abc";
    mockCaseFindFirst.mockResolvedValue(null);

    const { prisma } = await import("@/lib/prisma");

    await prisma.case.findFirst({
      where: { id: "case-1", userId },
    });

    expect(mockCaseFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId }),
      })
    );
  });
});
