// Historical journal import. Default is dry-run; remote writes are disabled.
//   node --import tsx src/lib/import/cli.ts [--journal .poc/state.json] [--retention-days N]
//   node --import tsx src/lib/import/cli.ts --execute --retention-days N   # refused: remote import disabled
import { parseArgs } from "node:util";
import { loadJournalFile } from "./journal.ts";
import { planJournalImport } from "./plan.ts";
import { ImportDisabledError, importEligibleObservations } from "./write.ts";

async function main() {
  const { values } = parseArgs({ options: {
    journal: { type: "string", default: ".poc/state.json" },
    "retention-days": { type: "string" },
    execute: { type: "boolean", default: false },
    "allow-reviews": { type: "boolean", default: false },
  } });

  const retentionRaw = values["retention-days"];
  const retentionDays = retentionRaw == null ? null : Number(retentionRaw);
  if (retentionRaw != null && (!Number.isInteger(retentionDays) || retentionDays! < 1 || retentionDays! > 730)) {
    throw new Error("retention_days_must_be_1_to_730");
  }

  const journal = await loadJournalFile(values.journal);
  const options = {
    retentionDays,
    reviewImportAllowed: values["allow-reviews"] === true,
    now: new Date(),
  };
  const plan = planJournalImport(journal, options);

  if (!values.execute) {
    return plan;
  }

  if (retentionDays == null) {
    return { ...plan, executed: false, refused: "retention_days_required" };
  }
  // Explicit approval is required, then still refused in this phase.
  try {
    await importEligibleObservations(async () => {
      throw new ImportDisabledError("remote_import_disabled");
    }, journal, {
      execute: true,
      retentionDays,
      reviewImportAllowed: options.reviewImportAllowed,
    });
  } catch (error) {
    if (error instanceof ImportDisabledError) {
      return { ...plan, executed: false, refused: error.message };
    }
    throw error;
  }
}

main().then(
  result => console.log(JSON.stringify(result, null, 2)),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : "import_failed");
    process.exitCode = 1;
  },
);
