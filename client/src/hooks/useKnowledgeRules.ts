import { useCallback, useRef, useState } from "react";
import {
  KnowledgeRule,
  addKnowledgeRule,
  deleteKnowledgeRule,
  getKnowledgeRules,
  updateKnowledgeRule,
} from "@/api/settings";
import { toast } from "@/lib/toast";
import { SETTINGS_TEXT } from "@/lib/strings";

export const MAX_RULES = 25;

// Prefer the server's Hebrew error message; fall back to a generic one.
// authFetch's "Unauthorized" is English-internal, never shown to the user.
function messageOf(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message && err.message !== "Unauthorized") return err.message;
  return fallback;
}

// State + CRUD for the user's custom knowledge rules. Fetching is lazy: `load`
// runs the request only once (first sheet open), unless forced for a retry.
export function useKnowledgeRules() {
  const [rules, setRules] = useState<KnowledgeRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const fetchedRef = useRef(false);

  const load = useCallback(async (force = false) => {
    if (fetchedRef.current && !force) return;
    fetchedRef.current = true;
    setLoading(true);
    setLoadFailed(false);
    try {
      setRules(await getKnowledgeRules());
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const addRule = useCallback(async (text: string): Promise<boolean> => {
    try {
      const rule = await addKnowledgeRule(text);
      setRules((prev) => [...prev, rule]);
      toast(SETTINGS_TEXT.ruleAdded, "success");
      return true;
    } catch (err) {
      toast(messageOf(err, SETTINGS_TEXT.addFailed));
      return false;
    }
  }, []);

  const updateRule = useCallback(async (id: string, text: string): Promise<boolean> => {
    try {
      const updated = await updateKnowledgeRule(id, text);
      setRules((prev) => prev.map((rule) => (rule.id === id ? updated : rule)));
      toast(SETTINGS_TEXT.ruleUpdated, "success");
      return true;
    } catch (err) {
      toast(messageOf(err, SETTINGS_TEXT.updateFailed));
      return false;
    }
  }, []);

  const deleteRule = useCallback(async (id: string): Promise<void> => {
    try {
      await deleteKnowledgeRule(id);
      setRules((prev) => prev.filter((rule) => rule.id !== id));
      toast(SETTINGS_TEXT.ruleDeleted, "success");
    } catch (err) {
      toast(messageOf(err, SETTINGS_TEXT.deleteFailed));
    }
  }, []);

  return {
    rules,
    loading,
    loadFailed,
    atLimit: rules.length >= MAX_RULES,
    load,
    addRule,
    updateRule,
    deleteRule,
  };
}
