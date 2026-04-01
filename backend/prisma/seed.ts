import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { chunkText } from "../src/utils/chunker";
import { embedTexts } from "../src/services/embedding";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_DOCUMENTS = [
  {
    name: "Referral Policy",
    content: `Referral Policy — Sunrise Allied Health Clinic

Our clinic accepts both GP referrals and self-referrals for all allied health services. A GP referral is required to access Medicare rebates under a Chronic Disease Management (CDM) plan, also known as a Team Care Arrangement (TCA). Without a valid referral, patients are welcome to attend as private-pay clients.

Referrals are valid for the calendar year in which they are issued and cover up to 5 allied health visits under Medicare. If additional sessions are needed, the patient must return to their GP for a new referral and updated care plan.

We also accept referrals from specialists, NDIS plan managers, and WorkCover/CTP insurers. Please ensure all referral documents include the patient's full name, date of birth, Medicare number, and the referring provider's details.

For NDIS participants, we require a copy of the current NDIS plan or a service agreement from the plan manager. Self-managed NDIS participants can book directly and will be invoiced at our standard NDIS rates.`,
  },
  {
    name: "Fees and Rebates Schedule",
    content: `Fees and Rebates — Sunrise Allied Health Clinic

Standard Consultation Fees (2024):
- Initial Assessment (60 min): $165
- Standard Follow-up (30 min): $95
- Extended Follow-up (45 min): $130
- Group Session (60 min): $45 per person

Medicare Rebates (with valid GP referral under CDM/TCA plan):
- Standard allied health consultation rebate: $56.10
- Out-of-pocket cost after rebate: approximately $38.90 for a standard follow-up

Private Health Insurance:
Rebates vary by fund and level of cover. We offer HICAPS on-the-spot claiming for most major funds. Please bring your health fund card to your appointment.

NDIS Pricing:
We charge in line with the current NDIS Price Guide. Rates vary by service type and time of delivery (standard, evening, weekend). Travel charges may apply for home visits.

Payment Methods:
We accept cash, EFTPOS, Visa, and Mastercard. Payment is required at the time of the appointment. We do not offer accounts or payment plans.

Bulk Billing:
We do not offer bulk billing. All patients with a Medicare referral will receive a rebate but must pay the full fee at the time of service.`,
  },
  {
    name: "Cancellation and No-Show Policy",
    content: `Cancellation and No-Show Policy — Sunrise Allied Health Clinic

We understand that plans change. However, missed appointments prevent other patients from accessing care. Please provide at least 24 hours' notice if you need to cancel or reschedule your appointment.

Late Cancellation (less than 24 hours' notice):
A cancellation fee of $65 will apply. This fee cannot be claimed through Medicare, private health insurance, or NDIS.

No-Show (failure to attend without notice):
The full consultation fee will be charged. This fee cannot be claimed through Medicare, private health insurance, or NDIS.

How to cancel or reschedule:
- Phone: (03) 9555 1234 during business hours (Mon–Fri, 8am–6pm)
- Online: via our booking portal at www.sunrisealliedhealth.com.au/bookings
- Email: reception@sunrisealliedhealth.com.au (please allow 4 hours for email confirmations)

Repeated no-shows:
Patients with 3 or more no-shows within a 6-month period may be asked to pre-pay for future appointments or may have their booking privileges suspended.

Late arrivals:
If you arrive more than 15 minutes late, your appointment may need to be shortened or rescheduled. The full fee will still apply for shortened appointments.`,
  },
  {
    name: "Telehealth FAQ",
    content: `Telehealth FAQ — Sunrise Allied Health Clinic

Q: Do you offer telehealth appointments?
A: Yes, we offer telehealth via secure video call for most of our allied health services. Telehealth is available for follow-up consultations only — initial assessments must be conducted in person.

Q: How do I book a telehealth appointment?
A: You can book a telehealth appointment through our online portal or by calling reception. When booking, select "Telehealth" as the appointment type. You will receive a video link via email 24 hours before your appointment.

Q: What platform do you use?
A: We use Coviu, an Australian-built, HIPAA-compliant telehealth platform. No downloads are required — the session runs in your web browser. We recommend using Google Chrome for the best experience.

Q: Can I claim Medicare rebates for telehealth?
A: Yes, Medicare rebates apply to eligible telehealth consultations under a valid CDM/TCA plan, the same as in-person visits.

Q: What if I have technical difficulties?
A: If you cannot connect, please call reception at (03) 9555 1234. We will attempt to troubleshoot or convert your appointment to a phone consultation. If the session cannot proceed, we will reschedule at no charge.

Q: Is telehealth suitable for everyone?
A: Telehealth is best suited for consultations that do not require physical examination or hands-on treatment. Your clinician will advise if an in-person visit is recommended instead.`,
  },
  {
    name: "Services Overview",
    content: `Services — Sunrise Allied Health Clinic

We are a multidisciplinary allied health clinic offering the following services:

Physiotherapy:
Treatment for musculoskeletal injuries, post-surgical rehabilitation, chronic pain management, and sports injuries. Our physios use a combination of manual therapy, exercise prescription, and dry needling.

Occupational Therapy:
Support for people of all ages with functional difficulties related to injury, disability, or developmental delays. Services include home assessments, equipment prescription, and return-to-work programs.

Speech Pathology:
Assessment and treatment for communication and swallowing difficulties in children and adults. Areas include speech sound disorders, language delays, stuttering, voice disorders, and dysphagia.

Psychology:
Individual therapy for anxiety, depression, trauma, stress management, and behavioural difficulties. We offer Cognitive Behavioural Therapy (CBT), Acceptance and Commitment Therapy (ACT), and EMDR.

Dietetics:
Personalised nutrition advice for chronic disease management, weight management, food allergies and intolerances, and sports nutrition. We provide meal plans and ongoing support.

All clinicians are registered with AHPRA and hold current professional indemnity insurance. We are registered NDIS providers and accept Medicare, DVA, WorkCover, and CTP referrals.`,
  },
];

async function main() {
  // Clear existing data
  await prisma.enquiry.deleteMany();
  await prisma.chunk.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  // Seed admin user
  console.log("Seeding admin user...");
  const passwordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@clinicdesk.demo",
      passwordHash,
      name: "Admin User",
      role: "admin",
    },
  });
  console.log(`  ✓ Admin user: ${admin.email} (password: admin123)\n`);

  console.log("Seeding demo documents...\n");

  for (const doc of DEMO_DOCUMENTS) {
    const chunks = chunkText(doc.content);

    // Generate embeddings for all chunks via OpenAI
    console.log(`  Generating embeddings for ${doc.name}...`);
    const embeddings = await embedTexts(chunks);

    // Create the document (without chunks, since we need raw SQL for vector)
    const document = await prisma.document.create({
      data: {
        name: doc.name,
        content: doc.content,
      },
    });

    // Insert chunks with embeddings using raw SQL
    for (let i = 0; i < chunks.length; i++) {
      const id = crypto.randomUUID();
      const vectorStr = `[${embeddings[i].join(",")}]`;
      await prisma.$queryRawUnsafe(
        `INSERT INTO chunks (id, document_id, content, embedding, chunk_index)
         VALUES ($1, $2, $3, $4::vector, $5)`,
        id,
        document.id,
        chunks[i],
        vectorStr,
        i,
      );
    }

    console.log(
      `  ✓ ${document.name} → ${chunks.length} chunks (with embeddings)`,
    );
  }

  console.log(
    "\nDone! Seeded",
    DEMO_DOCUMENTS.length,
    "documents with embeddings.",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
