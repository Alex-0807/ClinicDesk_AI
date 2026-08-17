import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { embedText } from "../services/embedding";
import { retrieveChunks } from "../services/retrieval";
import { generateReply } from "../services/generation";
import { evalDataset } from "./dataset";
import { isHit, reciprocalRank, factCoverage } from "./metrics";

const TOP_K = 5;

interface CaseResult {
  question: string;
  expectedCategory: string;
  actualCategory: string;
  categoryCorrect: boolean;
  expectedDocumentName: string | null;
  retrievedDocuments: string[];
  hit: boolean | null; // null = no expected document, not applicable
  reciprocalRank: number | null;
  factCoverage: number | null; // null = no facts to check
  expectedAnswered: boolean;
  actualAnswered: boolean;
  actualReason: string;
  answeredCorrect: boolean;
  draftReply: string;
}

async function runCase(testCase: (typeof evalDataset)[number]): Promise<CaseResult> {
  const queryEmbedding = await embedText(testCase.question);
  const chunks = await retrieveChunks(queryEmbedding, TOP_K);

  const hasExpectedDoc = testCase.expectedDocumentName !== null;

  if (chunks.length === 0) {
    return {
      question: testCase.question,
      expectedCategory: testCase.expectedCategory,
      actualCategory: "General",
      categoryCorrect: testCase.expectedCategory === "General",
      expectedDocumentName: testCase.expectedDocumentName,
      retrievedDocuments: [],
      hit: hasExpectedDoc ? false : null,
      reciprocalRank: hasExpectedDoc ? 0 : null,
      factCoverage: null,
      expectedAnswered: testCase.expectedAnswered,
      actualAnswered: false,
      actualReason: "INSUFFICIENT_CONTEXT",
      answeredCorrect: testCase.expectedAnswered === false,
      draftReply: "(no chunks retrieved — fallback message)",
    };
  }

  const { category, answered, reason, draftReply } = await generateReply(testCase.question, chunks);

  return {
    question: testCase.question,
    expectedCategory: testCase.expectedCategory,
    actualCategory: category,
    categoryCorrect: category === testCase.expectedCategory,
    expectedDocumentName: testCase.expectedDocumentName,
    retrievedDocuments: chunks.map((c) => c.document_name),
    hit: hasExpectedDoc ? isHit(chunks, testCase.expectedDocumentName) : null,
    reciprocalRank: hasExpectedDoc ? reciprocalRank(chunks, testCase.expectedDocumentName) : null,
    factCoverage: factCoverage(draftReply, testCase.expectedFacts),
    expectedAnswered: testCase.expectedAnswered,
    actualAnswered: answered,
    actualReason: reason,
    answeredCorrect: answered === testCase.expectedAnswered,
    draftReply,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

async function main() {
  console.log(`Running RAG evaluation on ${evalDataset.length} cases...\n`);

  const results: CaseResult[] = [];
  for (const testCase of evalDataset) {
    const result = await runCase(testCase);
    results.push(result);
    console.log(`  ${result.categoryCorrect ? "✓" : "✗"} ${result.question}`);
  }

  const retrievalResults = results.filter((r) => r.hit !== null);
  const factResults = results.filter((r) => r.factCoverage !== null);

  const summary = {
    totalCases: results.length,
    categoryAccuracy: average(results.map((r) => (r.categoryCorrect ? 1 : 0))),
    retrievalCasesEvaluated: retrievalResults.length,
    hitRateAt5: average(retrievalResults.map((r) => (r.hit ? 1 : 0))),
    mrr: average(retrievalResults.map((r) => r.reciprocalRank ?? 0)),
    factCoverageCasesEvaluated: factResults.length,
    avgFactCoverage: average(factResults.map((r) => r.factCoverage ?? 0)),
    answerabilityAccuracy: average(results.map((r) => (r.answeredCorrect ? 1 : 0))),
  };

  console.log("\n--- Summary ---");
  console.table({
    "Category accuracy": `${(summary.categoryAccuracy * 100).toFixed(0)}%`,
    "Hit Rate@5": `${(summary.hitRateAt5 * 100).toFixed(0)}% (${summary.retrievalCasesEvaluated} cases)`,
    MRR: summary.mrr.toFixed(2),
    "Avg fact coverage": `${(summary.avgFactCoverage * 100).toFixed(0)}% (${summary.factCoverageCasesEvaluated} cases)`,
    "Answerability accuracy": `${(summary.answerabilityAccuracy * 100).toFixed(0)}% (${summary.totalCases} cases)`,
  });

  const report = {
    timestamp: new Date().toISOString(),
    summary,
    cases: results,
  };

  const outDir = path.join(__dirname, "..", "..", "eval-results");
  fs.mkdirSync(outDir, { recursive: true });
  const filename = `eval-${report.timestamp.replace(/[:.]/g, "-")}.json`;
  fs.writeFileSync(path.join(outDir, filename), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(report, null, 2));

  console.log(`\nReport written to eval-results/${filename}`);
}

main()
  .catch((error) => {
    console.error("Eval run failed:", error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
