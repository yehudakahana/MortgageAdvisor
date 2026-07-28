import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import { UserSettingsModel } from "../models/UserSettings";
import { SETTINGS_MESSAGES } from "../constants/messages";

const router = Router();

export const MAX_RULE_LENGTH = 200;
export const MAX_RULES_PER_USER = 25;

// Normalize incoming rule text: newlines collapse to a single space (each rule
// is injected into the LLM prompt as exactly one line), then trim.
function normalizeRuleText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s*[\r\n]+\s*/g, " ").trim();
}

// Shared text validation for create + edit. Returns an error message or null.
function ruleTextError(text: string): string | null {
  if (!text) return SETTINGS_MESSAGES.emptyRule;
  if (text.length > MAX_RULE_LENGTH) return SETTINGS_MESSAGES.ruleTooLong;
  return null;
}

// The auth middleware guarantees req.user; the fallback satisfies strict TS.
function usernameOf(req: Request): string {
  return req.user?.username ?? "";
}

router.get("/knowledge", async (req: Request, res: Response) => {
  try {
    const settings = await UserSettingsModel.findOne({ username: usernameOf(req) });
    res.json(settings?.customKnowledge ?? []);
  } catch (err) {
    console.error("[settings] failed to load rules:", err);
    res.status(500).json({ error: SETTINGS_MESSAGES.fetchFailed });
  }
});

router.post("/knowledge", async (req: Request, res: Response) => {
  const text = normalizeRuleText((req.body ?? {}).text);
  const invalid = ruleTextError(text);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const username = usernameOf(req);
    const settings =
      (await UserSettingsModel.findOne({ username })) ??
      new UserSettingsModel({ username, customKnowledge: [] });

    if (settings.customKnowledge.length >= MAX_RULES_PER_USER) {
      return res.status(400).json({ error: SETTINGS_MESSAGES.ruleLimitReached });
    }
    if (settings.customKnowledge.some((rule) => rule.text === text)) {
      return res.status(400).json({ error: SETTINGS_MESSAGES.duplicateRule });
    }

    const rule = { id: randomUUID(), text, createdAt: new Date() };
    settings.customKnowledge.push(rule);
    await settings.save();
    res.status(201).json(rule);
  } catch (err) {
    console.error("[settings] failed to add rule:", err);
    res.status(500).json({ error: SETTINGS_MESSAGES.saveFailed });
  }
});

// Editing never adds a rule, so the 25-rule cap is intentionally not applied.
router.put("/knowledge/:ruleId", async (req: Request, res: Response) => {
  const text = normalizeRuleText((req.body ?? {}).text);
  const invalid = ruleTextError(text);
  if (invalid) return res.status(400).json({ error: invalid });

  try {
    const settings = await UserSettingsModel.findOne({ username: usernameOf(req) });
    const rule = settings?.customKnowledge.find((r) => r.id === req.params.ruleId);
    if (!settings || !rule) {
      return res.status(404).json({ error: SETTINGS_MESSAGES.ruleNotFound });
    }

    rule.text = text;
    rule.updatedAt = new Date();
    await settings.save();
    res.json(rule);
  } catch (err) {
    console.error("[settings] failed to update rule:", err);
    res.status(500).json({ error: SETTINGS_MESSAGES.saveFailed });
  }
});

router.delete("/knowledge/:ruleId", async (req: Request, res: Response) => {
  try {
    const settings = await UserSettingsModel.findOne({ username: usernameOf(req) });
    const remaining = settings?.customKnowledge.filter((r) => r.id !== req.params.ruleId);
    if (!settings || !remaining || remaining.length === settings.customKnowledge.length) {
      return res.status(404).json({ error: SETTINGS_MESSAGES.ruleNotFound });
    }

    settings.customKnowledge = remaining;
    await settings.save();
    res.json({ id: req.params.ruleId });
  } catch (err) {
    console.error("[settings] failed to delete rule:", err);
    res.status(500).json({ error: SETTINGS_MESSAGES.deleteFailed });
  }
});

export default router;
