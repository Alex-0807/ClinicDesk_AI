export interface EvalCase {
  question: string;
  expectedCategory: string;
  expectedDocumentName: string | null; // null = no relevant document should exist
  expectedFacts: string[]; // substrings that should appear in the draft reply (case-insensitive)
  expectedAnswered: boolean; // should generateReply set answered=true for this question?
}

/**
 * Golden dataset for RAG evaluation. Questions are written against the demo
 * documents seeded by prisma/seed.ts — keep this in sync if that content changes.
 */
export const evalDataset: EvalCase[] = [
  // Referral Policy
  {
    question: "Do I need a GP referral to see a physio here?",
    expectedCategory: "Referral",
    expectedDocumentName: "Referral Policy",
    expectedFacts: ["self-referral", "Medicare"],
    expectedAnswered: true,
  },
  {
    question: "How long is a referral valid for and how many visits does it cover?",
    expectedCategory: "Referral",
    expectedDocumentName: "Referral Policy",
    expectedFacts: ["calendar year", "5"],
    expectedAnswered: true,
  },
  {
    question: "I'm a self-managed NDIS participant, can I book directly?",
    expectedCategory: "Referral",
    expectedDocumentName: "Referral Policy",
    expectedFacts: ["self-managed", "NDIS"],
    expectedAnswered: true,
  },

  // Fees and Rebates Schedule
  {
    question: "How much does an initial assessment cost?",
    expectedCategory: "Fees",
    expectedDocumentName: "Fees and Rebates Schedule",
    expectedFacts: ["165"],
    expectedAnswered: true,
  },
  {
    question: "Do you bulk bill Medicare patients?",
    expectedCategory: "Fees",
    expectedDocumentName: "Fees and Rebates Schedule",
    expectedFacts: ["do not offer bulk billing"],
    expectedAnswered: true,
  },
  {
    question: "What payment methods do you accept?",
    expectedCategory: "Fees",
    expectedDocumentName: "Fees and Rebates Schedule",
    expectedFacts: ["EFTPOS", "cash"],
    expectedAnswered: true,
  },

  // Cancellation and No-Show Policy
  {
    question: "What happens if I miss my appointment without cancelling?",
    expectedCategory: "Cancellation",
    expectedDocumentName: "Cancellation and No-Show Policy",
    expectedFacts: ["full consultation fee"],
    expectedAnswered: true,
  },
  {
    question: "How much notice do I need to give to cancel without a fee?",
    expectedCategory: "Cancellation",
    expectedDocumentName: "Cancellation and No-Show Policy",
    expectedFacts: ["24 hours"],
    expectedAnswered: true,
  },
  {
    question: "What if I arrive 20 minutes late to my appointment?",
    expectedCategory: "Cancellation",
    expectedDocumentName: "Cancellation and No-Show Policy",
    expectedFacts: ["15 minutes"],
    expectedAnswered: true,
  },

  // Telehealth FAQ
  {
    question: "Can I do my first assessment over telehealth?",
    expectedCategory: "Telehealth",
    expectedDocumentName: "Telehealth FAQ",
    expectedFacts: ["follow-up", "in person"],
    expectedAnswered: true,
  },
  {
    question: "What video platform do you use for telehealth appointments?",
    expectedCategory: "Telehealth",
    expectedDocumentName: "Telehealth FAQ",
    expectedFacts: ["Coviu"],
    expectedAnswered: true,
  },
  {
    question: "Can I claim a Medicare rebate for a telehealth session?",
    expectedCategory: "Telehealth",
    expectedDocumentName: "Telehealth FAQ",
    expectedFacts: ["Medicare"],
    expectedAnswered: true,
  },

  // Services Overview
  {
    question: "Do you offer speech pathology for children?",
    expectedCategory: "Services",
    expectedDocumentName: "Services Overview",
    expectedFacts: ["Speech Pathology", "children"],
    expectedAnswered: true,
  },
  {
    question: "What kind of psychology therapy approaches do you use?",
    expectedCategory: "Services",
    expectedDocumentName: "Services Overview",
    expectedFacts: ["Cognitive Behavioural Therapy", "CBT"],
    expectedAnswered: true,
  },
  {
    question: "Are your clinicians registered with AHPRA?",
    expectedCategory: "Services",
    expectedDocumentName: "Services Overview",
    expectedFacts: ["AHPRA"],
    expectedAnswered: true,
  },

  // No relevant document — should decline (answered=false), not hallucinate
  {
    question: "What's the weather like tomorrow?",
    expectedCategory: "General",
    expectedDocumentName: null,
    expectedFacts: [],
    expectedAnswered: false,
  },
  {
    question: "Can you recommend a good restaurant nearby?",
    expectedCategory: "General",
    expectedDocumentName: null,
    expectedFacts: [],
    expectedAnswered: false,
  },
];
