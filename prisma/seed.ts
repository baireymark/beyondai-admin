/**
 * Seeds the database. Run with `npm run db:seed`.
 *
 * - Always: adds every email in ADMIN_SEED_EMAILS (comma-separated) as an
 *   active admin. This is how the first admin gets access in a new
 *   environment.
 * - Outside production: adds a test staff account (staff@example.com) and
 *   sample enquiries across topics and statuses, once. Set
 *   SEED_SAMPLE_DATA=false to skip them.
 */
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient, type LeadStatus, type Topic } from '../generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

// Deterministic pseudo-random numbers, so every developer gets the same data.
let state = 20261019;
function random(): number {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
}
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]!;
}

const PEOPLE = [
  ['Maria Santos', 'Example Corp'],
  ['Jose Reyes', 'Northwind Logistics'],
  ['Ana Cruz', 'Pacific Retail Group'],
  ['Miguel Bautista', null],
  ['Liza Garcia', 'Cebu Health Partners'],
  ['Paolo Mendoza', 'Davao Agritech'],
  ['Grace Tan', 'Lumen Financial'],
  ['Oliver Hughes', 'Thames Analytics Ltd'],
  ['Priya Nair', 'Brightpath Schools'],
  ['Carlo Villanueva', 'Manila Freight Co.'],
  ['Sofia Ramos', 'Ramos Family Office'],
  ['Daniel Lim', 'Island Telecom'],
] as const;

const MESSAGES: Record<Topic, string[]> = {
  BOOK_CONSULTATION: [
    'We would like to talk about moving our reporting to the cloud this year.',
    'Can we schedule a call about an AI roadmap for our operations team?',
  ],
  PRODUCT_DEMO: [
    'We are looking at replacing our HR system next quarter. Could we see a demo?',
    'Interested in a Talkora AI demo for our customer service team of 40.',
  ],
  AI_EDUCATION: [
    'Do you have evening classes for the AI Education course? I work during the day.',
    'What are the prerequisites for the AI Education programme?',
  ],
  CORPORATE_TRAINING: [
    'We need a two-day AI literacy workshop for about 25 managers.',
    'Could you run prompt engineering training for our marketing department?',
  ],
  PARTNERSHIP: [
    'We are a systems integrator in Cebu and would like to explore a reseller partnership.',
  ],
  TECHNICAL_SUPPORT: ['Our ERP integration stopped syncing invoices since Monday. Please advise.'],
  OTHER: ['Do you hire interns for the summer? I am a computer science student.'],
};

const TOPIC_VALUES = Object.keys(MESSAGES) as Topic[];
const INTERESTS = [
  'ERP',
  'HRM_SOFTWARE',
  'AI_ANALYTICS',
  'AGENTIC_AI',
  'CLOUD_MODERNIZATION',
  'TALKORA_AI',
];

async function seedAdmins(): Promise<void> {
  const emails = (process.env.ADMIN_SEED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  for (const email of emails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN', active: true },
      create: { email, name: email.split('@')[0], role: 'ADMIN' },
    });
  }
  console.log(`Admins on the allowlist: ${emails.length}`);
}

async function seedSampleData(): Promise<void> {
  const staff = await prisma.user.upsert({
    where: { email: 'staff@example.com' },
    update: { active: true },
    create: { email: 'staff@example.com', name: 'Sam Staff', role: 'STAFF' },
  });
  const owners = await prisma.user.findMany({ where: { active: true }, select: { id: true } });

  if ((await prisma.lead.count()) > 0) {
    console.log('Sample enquiries already exist; skipping.');
    return;
  }

  const now = Date.now();
  const statuses: LeadStatus[] = [
    'NEW',
    'NEW',
    'NEW',
    'CONTACTED',
    'CONTACTED',
    'QUALIFIED',
    'WON',
    'LOST',
  ];

  for (let index = 0; index < 36; index += 1) {
    const [fullName, organization] = pick(PEOPLE);
    const topic = pick(TOPIC_VALUES);
    // Spread over 45 days; the first few arrive in the last day so they are not overdue yet.
    const createdAt = new Date(now - (index < 4 ? random() * 20 * HOUR : random() * 45 * DAY));
    const status = index < 4 ? 'NEW' : pick(statuses);
    const contacted = status !== 'NEW' && random() > 0.15;
    const firstContactedAt = contacted
      ? new Date(createdAt.getTime() + random() * 30 * HOUR)
      : null;
    const owner = status === 'NEW' && random() > 0.3 ? null : pick(owners);
    const actorId = owner?.id ?? staff.id;
    const [first, last] = fullName.toLowerCase().split(' ');

    const lead = await prisma.lead.create({
      data: {
        fullName,
        workEmail: `${first}.${last}@${organization ? organization.toLowerCase().replace(/[^a-z]+/g, '') : 'gmail'}.example`,
        organization,
        topic,
        interestAreas: random() > 0.4 ? [pick(INTERESTS)] : [],
        preferredCallTime: random() > 0.6 ? new Date(createdAt.getTime() + 3 * DAY) : null,
        message: pick(MESSAGES[topic]),
        consentAt: createdAt,
        consentVersion: '2026-10',
        status,
        ownerId: owner?.id ?? null,
        replyDueAt: new Date(createdAt.getTime() + DAY),
        firstContactedAt,
        sourcePage: '/contact',
        utmSource: random() > 0.7 ? 'linkedin' : null,
        createdAt,
      },
    });

    const activity: {
      action: 'created' | 'owner_changed' | 'status_changed' | 'note_added';
      actorId: string | null;
      detail: object;
      at: Date;
    }[] = [{ action: 'created', actorId: null, detail: { topic }, at: createdAt }];
    let at = createdAt.getTime() + 2 * HOUR;
    if (owner) {
      activity.push({
        action: 'owner_changed',
        actorId,
        detail: { from: null, to: owner.id },
        at: new Date(at),
      });
      at += HOUR;
    }
    if (status !== 'NEW') {
      activity.push({
        action: 'status_changed',
        actorId,
        detail: { from: 'NEW', to: status },
        at: new Date(at),
      });
      at += HOUR;
    }
    if (status === 'WON' || status === 'LOST') {
      const note = await prisma.leadNote.create({
        data: {
          leadId: lead.id,
          authorId: actorId,
          body:
            status === 'WON'
              ? 'Signed the proposal after the second call.'
              : 'No budget this year; follow up in Q3.',
          createdAt: new Date(at),
        },
      });
      activity.push({
        action: 'note_added',
        actorId,
        detail: { noteId: note.id, reasonFor: status },
        at: new Date(at),
      });
    }
    await prisma.leadActivity.createMany({
      data: activity.map((entry) => ({
        leadId: lead.id,
        actorId: entry.actorId,
        action: entry.action,
        detail: entry.detail,
        createdAt: entry.at,
      })),
    });
  }
  console.log('Added 36 sample enquiries and staff@example.com.');
}

async function main(): Promise<void> {
  await seedAdmins();
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && process.env.SEED_SAMPLE_DATA !== 'false') await seedSampleData();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
