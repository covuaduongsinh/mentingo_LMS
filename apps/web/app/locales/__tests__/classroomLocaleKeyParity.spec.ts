import { describe, expect, it } from "vitest";

import cs from "../cs/translation.json";
import de from "../de/translation.json";
import en from "../en/translation.json";
import es from "../es/translation.json";
import lt from "../lt/translation.json";
import pl from "../pl/translation.json";
import vi from "../vi/translation.json";

/**
 * The full 7-locale translation files already carry a lot of pre-existing key drift
 * (hundreds of keys missing in pl/de/lt/cs/es relative to en) predating the Classroom
 * feature — fixing that wholesale is unrelated cleanup, out of scope here. This test only
 * enforces the invariant this feature actually needs: every key under the "classroom"
 * namespace this feature owns must exist, with the same shape, in all 7 locale files —
 * per AGENTS.md ("Add visible strings to all locale files, not only English or Polish").
 */

type TranslationTree = { [key: string]: string | TranslationTree };

function flattenKeys(tree: TranslationTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "object" && value !== null ? flattenKeys(value, path) : [path];
  });
}

const LOCALES: Record<string, TranslationTree> = { en, pl, de, lt, cs, es, vi };

describe("classroom locale keys stay in sync across all 7 locale files", () => {
  const baseKeys = flattenKeys((en as TranslationTree).classroom as TranslationTree).sort();

  it("has a non-empty classroom namespace to compare against", () => {
    expect(baseKeys.length).toBeGreaterThan(0);
  });

  for (const [locale, tree] of Object.entries(LOCALES)) {
    if (locale === "en") continue;

    it(`${locale} has exactly the same classroom.* keys as en`, () => {
      const classroomTree = tree.classroom as TranslationTree | undefined;
      expect(classroomTree).toBeDefined();

      const localeKeys = flattenKeys(classroomTree ?? {}).sort();
      const missing = baseKeys.filter((key) => !localeKeys.includes(key));
      const extra = localeKeys.filter((key) => !baseKeys.includes(key));

      expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });
  }
});
