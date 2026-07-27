import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * `swagger-typescript-api` names generated frontend DTOs/methods after the controller
 * *method name*, not the controller class — so two route handlers named the same thing
 * anywhere in `apps/api/src` silently overwrite each other's generated type, and the
 * failure only shows up as a `tsc` error in an unrelated frontend file. This has bitten
 * the chess-* modules three times (see docs/research/lila/05-roadmap.md, Đợt L2/L7/L10) and
 * is the reason every new `classroom.*` method is prefixed `classroom`/`Classroom`.
 *
 * This test enforces "no *new* duplicates" rather than "zero duplicates" — the repo already
 * carries ~20 pre-existing duplicate names predating this rule (see ALLOWED_EXISTING_DUPLICATES
 * below). Fixing those is a separate, unrelated cleanup; this test's job is to stop the count
 * from growing.
 */

const SRC_ROOT = join(__dirname, "..");
const HTTP_METHOD_DECORATOR = /@(Get|Post|Put|Patch|Delete)\(/;
const METHOD_SIGNATURE = /^\s*(?:public\s+|private\s+|protected\s+)?async\s+([a-zA-Z0-9_]+)\s*\(/;
const MAX_LINES_AFTER_DECORATOR_TO_SCAN = 12;

// Baseline captured when this test was added (Đợt C1 of the Classroom roadmap) — do not add
// new names here. If you hit a real name collision, rename one of the two methods instead.
const ALLOWED_EXISTING_DUPLICATES = new Set([
  "createLanguage",
  "deleteLanguage",
  "updateUser",
  "updateBaseLanguage",
  "tusOptionsUpload",
  "tusOptionsBase",
  "setUserGroups",
  "patchTusUpload",
  "handleWebhook",
  "getUsers",
  "getUserById",
  "getTusUpload",
  "getStudentsWithEnrollmentDate",
  "getCertificateSharePage",
  "getCertificateShareImage",
  "getCertificate",
  "downloadCertificate",
  "createUser",
  "createTusUpload",
  "createTenant",
  "createCertificateShareLink",
  "addNewLanguage",
]);

function findControllerFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === "__tests__") continue;
      files.push(...findControllerFiles(fullPath));
    } else if (entry.endsWith(".controller.ts")) {
      files.push(fullPath);
    }
  }

  return files;
}

function extractHandlerMethodNames(filePath: string): string[] {
  const lines = readFileSync(filePath, "utf-8").split("\n");
  const names: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!HTTP_METHOD_DECORATOR.test(lines[i])) continue;

    for (
      let j = i + 1;
      j < Math.min(lines.length, i + 1 + MAX_LINES_AFTER_DECORATOR_TO_SCAN);
      j++
    ) {
      const match = lines[j].match(METHOD_SIGNATURE);
      if (match) {
        names.push(match[1]);
        break;
      }
    }
  }

  return names;
}

describe("controller method names stay unique across apps/api/src", () => {
  it("does not introduce new duplicate handler method names", () => {
    const controllerFiles = findControllerFiles(SRC_ROOT);
    const occurrences = new Map<string, string[]>();

    for (const filePath of controllerFiles) {
      for (const methodName of extractHandlerMethodNames(filePath)) {
        const existing = occurrences.get(methodName) ?? [];
        existing.push(filePath);
        occurrences.set(methodName, existing);
      }
    }

    const newDuplicates: string[] = [];
    for (const [methodName, files] of occurrences) {
      if (files.length > 1 && !ALLOWED_EXISTING_DUPLICATES.has(methodName)) {
        newDuplicates.push(`"${methodName}" in:\n  - ${files.join("\n  - ")}`);
      }
    }

    expect(newDuplicates).toEqual([]);
  });
});
