import { afterEach, describe, expect, it, vi } from "vitest";
import Plugin from "../index";

describe("AutoModerationBot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports content when model confidence crosses the threshold", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify({
              hasViolation: true,
              confidence: 0.92,
              violatedRules: ["No harassment"],
              explanation: "The comment contains a direct personal attack.",
              suggestedAction: "report"
            })
          }
        }]
      })
    }));

    const reportContentAsBot = vi.fn().mockResolvedValue({ issueId: "issue-1", issueNumber: 7 });
    const plugin = new Plugin({
      scope: "FORUM",
      settings: {
        confidenceThreshold: 0.7,
        profiles: [{ id: "general-moderation", displayName: "General", prompt: "Return JSON." }]
      },
      secrets: { server: { OPENAI_API_KEY: "sk-test-key-12345" }, forum: {} },
      storeFlag: vi.fn(),
      log: vi.fn(),
      reportContentAsBot
    });

    const result = await plugin.handleEvent({
      type: "comment.created",
      payload: {
        commentId: "comment-1",
        commentText: "You are awful.",
        context: { channel: { rules: ["No harassment"] } }
      }
    });

    expect(result.success).toBe(true);
    expect(result.result.issueNumber).toBe(7);
    expect(reportContentAsBot).toHaveBeenCalledWith(expect.objectContaining({
      contentType: "comment",
      contentId: "comment-1",
      selectedForumRules: ["No harassment"],
      botName: "automod"
    }));
  });
});
