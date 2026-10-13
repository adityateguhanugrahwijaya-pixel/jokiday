import { LedgerService } from "../src/server/ledger/ledger.service";
import { prisma } from "../src/lib/db";

async function main() {
  const rep = await LedgerService.getReconciliationReport();
  console.log("RECONCILIATION REPORT:", JSON.stringify(rep, null, 2));
}

main().finally(() => prisma.$disconnect());
