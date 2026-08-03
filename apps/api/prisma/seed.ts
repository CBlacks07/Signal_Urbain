import { PrismaClient, IncidentCategory, IncidentStatus, Priority } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Communes de Lomé ─────────────────────────────
  const communes = await Promise.all([
    prisma.commune.upsert({ where: { name: 'Golfe 1' }, update: {}, create: { name: 'Golfe 1', prefecture: 'Golfe', contactEmail: 'golfe1@mairie-lome.tg' } }),
    prisma.commune.upsert({ where: { name: 'Golfe 2' }, update: {}, create: { name: 'Golfe 2', prefecture: 'Golfe', contactEmail: 'golfe2@mairie-lome.tg' } }),
    prisma.commune.upsert({ where: { name: 'Golfe 3' }, update: {}, create: { name: 'Golfe 3', prefecture: 'Golfe', contactEmail: 'golfe3@mairie-lome.tg' } }),
    prisma.commune.upsert({ where: { name: 'Golfe 4' }, update: {}, create: { name: 'Golfe 4', prefecture: 'Golfe' } }),
    prisma.commune.upsert({ where: { name: 'Golfe 5' }, update: {}, create: { name: 'Golfe 5', prefecture: 'Golfe' } }),
    prisma.commune.upsert({ where: { name: 'Golfe 6' }, update: {}, create: { name: 'Golfe 6', prefecture: 'Golfe' } }),
    prisma.commune.upsert({ where: { name: 'Golfe 7' }, update: {}, create: { name: 'Golfe 7', prefecture: 'Golfe' } }),
    prisma.commune.upsert({ where: { name: 'Agoè-Nyivé 1' }, update: {}, create: { name: 'Agoè-Nyivé 1', prefecture: 'Agoè-Nyivé' } }),
    prisma.commune.upsert({ where: { name: 'Agoè-Nyivé 2' }, update: {}, create: { name: 'Agoè-Nyivé 2', prefecture: 'Agoè-Nyivé' } }),
    prisma.commune.upsert({ where: { name: 'Agoè-Nyivé 3' }, update: {}, create: { name: 'Agoè-Nyivé 3', prefecture: 'Agoè-Nyivé' } }),
    prisma.commune.upsert({ where: { name: 'Agoè-Nyivé 4' }, update: {}, create: { name: 'Agoè-Nyivé 4', prefecture: 'Agoè-Nyivé' } }),
    prisma.commune.upsert({ where: { name: 'Agoè-Nyivé 5' }, update: {}, create: { name: 'Agoè-Nyivé 5', prefecture: 'Agoè-Nyivé' } }),
  ]);

  console.log(`${communes.length} communes créées`);

  const golfe3 = communes.find(c => c.name === 'Golfe 3')!;
  const golfe1 = communes.find(c => c.name === 'Golfe 1')!;
  const golfe5 = communes.find(c => c.name === 'Golfe 5')!;
  const agoe1  = communes.find(c => c.name === 'Agoè-Nyivé 1')!;

  // ─── Super Admin ──────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: '+22890000000' },
    update: {},
    create: { phone: '+22890000000', name: 'Super Admin', role: 'SUPER_ADMIN', isVerified: true, communeId: golfe1.id },
  });

  // ─── Agent de test ────────────────────────────────
  const agent = await prisma.user.upsert({
    where: { phone: '+22891000001' },
    update: {},
    create: { phone: '+22891000001', name: 'Kofi Mensah', role: 'AGENT', isVerified: true, communeId: golfe3.id },
  });

  console.log(`Utilisateurs créés: ${admin.name}, ${agent.name}`);

  // ─── Incidents de test ────────────────────────────
  const incidents: Array<{
    refCode: string;
    category: IncidentCategory;
    description: string;
    address: string;
    latitude: number;
    longitude: number;
    status: IncidentStatus;
    priority: Priority;
    communeId: string;
    reporterId: string;
    assignedTo?: string;
    upvotesCount: number;
  }> = [
    {
      refCode: 'SIG-2026-0001',
      category: IncidentCategory.inondation,
      description: 'Route inondée après les pluies. L\'eau stagne depuis 3 jours devant le marché.',
      address: 'Avenue des Nîmes, Bè, Lomé',
      latitude: 6.1320, longitude: 1.2280,
      status: IncidentStatus.EN_COURS,
      priority: Priority.CRITIQUE,
      communeId: golfe3.id, reporterId: admin.id,
      assignedTo: agent.id, upvotesCount: 14,
    },
    {
      refCode: 'SIG-2026-0002',
      category: IncidentCategory.electrique,
      description: 'Poteau électrique tombé sur la chaussée, câbles à nu. Danger immédiat.',
      address: 'Rue de l\'Église, Tokoin, Lomé',
      latitude: 6.1450, longitude: 1.2190,
      status: IncidentStatus.ASSIGNE,
      priority: Priority.CRITIQUE,
      communeId: golfe3.id, reporterId: admin.id,
      assignedTo: agent.id, upvotesCount: 22,
    },
    {
      refCode: 'SIG-2026-0003',
      category: IncidentCategory.depotoir,
      description: 'Dépôt sauvage d\'ordures ménagères accumulé depuis plusieurs semaines.',
      address: 'Quartier Nyékonakpoè, Lomé',
      latitude: 6.1390, longitude: 1.2150,
      status: IncidentStatus.SIGNALE,
      priority: Priority.HAUTE,
      communeId: golfe3.id, reporterId: admin.id,
      upvotesCount: 8,
    },
    {
      refCode: 'SIG-2026-0004',
      category: IncidentCategory.route,
      description: 'Nid-de-poule profond causant des accidents. Deux motos endommagées cette semaine.',
      address: 'Boulevard du 13 Janvier, Lomé',
      latitude: 6.1370, longitude: 1.2250,
      status: IncidentStatus.RESOLU,
      priority: Priority.MOYENNE,
      communeId: golfe1.id, reporterId: admin.id,
      upvotesCount: 11,
    },
    {
      refCode: 'SIG-2026-0005',
      category: IncidentCategory.eclairage,
      description: 'Lampadaires éteints sur 200m. Le quartier est plongé dans le noir la nuit.',
      address: 'Rue de la Paix, Agbalépédogan, Lomé',
      latitude: 6.1410, longitude: 1.2120,
      status: IncidentStatus.SIGNALE,
      priority: Priority.MOYENNE,
      communeId: golfe5.id, reporterId: admin.id,
      upvotesCount: 6,
    },
    {
      refCode: 'SIG-2026-0006',
      category: IncidentCategory.eau,
      description: 'Canalisation d\'eau cassée, fuite importante. L\'eau coule depuis 2 jours.',
      address: 'Quartier Hanoukopé, Lomé',
      latitude: 6.1480, longitude: 1.2200,
      status: IncidentStatus.EN_COURS,
      priority: Priority.HAUTE,
      communeId: golfe3.id, reporterId: admin.id,
      assignedTo: agent.id, upvotesCount: 17,
    },
    {
      refCode: 'SIG-2026-0007',
      category: IncidentCategory.route,
      description: 'Effondrement partiel de la chaussée suite aux pluies. Passage dangereux.',
      address: 'Rue des Ambassades, Lomé',
      latitude: 6.1340, longitude: 1.2310,
      status: IncidentStatus.SIGNALE,
      priority: Priority.CRITIQUE,
      communeId: golfe1.id, reporterId: admin.id,
      upvotesCount: 19,
    },
    {
      refCode: 'SIG-2026-0008',
      category: IncidentCategory.depotoir,
      description: 'Décharge sauvage à proximité de l\'école primaire. Risque sanitaire.',
      address: 'Quartier Agoè Zongo, Lomé',
      latitude: 6.1700, longitude: 1.2100,
      status: IncidentStatus.SIGNALE,
      priority: Priority.HAUTE,
      communeId: agoe1.id, reporterId: admin.id,
      upvotesCount: 9,
    },
    {
      refCode: 'SIG-2026-0009',
      category: IncidentCategory.inondation,
      description: 'Caniveaux bouchés entraînant des inondations récurrentes dans le quartier.',
      address: 'Quartier Gbossimé, Lomé',
      latitude: 6.1290, longitude: 1.2180,
      status: IncidentStatus.RESOLU,
      priority: Priority.HAUTE,
      communeId: golfe5.id, reporterId: admin.id,
      upvotesCount: 13,
    },
    {
      refCode: 'SIG-2026-0010',
      category: IncidentCategory.electrique,
      description: 'Transformateur électrique en feu. Risque d\'incendie pour les habitations.',
      address: 'Quartier Adidogomé, Lomé',
      latitude: 6.1650, longitude: 1.2050,
      status: IncidentStatus.ASSIGNE,
      priority: Priority.CRITIQUE,
      communeId: agoe1.id, reporterId: admin.id,
      assignedTo: agent.id, upvotesCount: 31,
    },
    {
      refCode: 'SIG-2026-0011',
      category: IncidentCategory.eau,
      description: 'Robinet de fontaine publique cassé. Gaspillage d\'eau potable.',
      address: 'Marché de Hédzranawoé, Lomé',
      latitude: 6.1550, longitude: 1.2080,
      status: IncidentStatus.SIGNALE,
      priority: Priority.BASSE,
      communeId: agoe1.id, reporterId: admin.id,
      upvotesCount: 3,
    },
    {
      refCode: 'SIG-2026-0012',
      category: IncidentCategory.eclairage,
      description: 'Panneau de signalisation routière renversé. Croisement dangereux sans indication.',
      address: 'Carrefour de la Victoire, Lomé',
      latitude: 6.1360, longitude: 1.2240,
      status: IncidentStatus.RESOLU,
      priority: Priority.MOYENNE,
      communeId: golfe1.id, reporterId: admin.id,
      upvotesCount: 5,
    },
  ];

  let created = 0;
  for (const inc of incidents) {
    await prisma.incident.upsert({
      where: { refCode: inc.refCode },
      update: {},
      create: inc,
    });
    created++;
  }

  console.log(`${created} incidents créés`);

  // ─── Règles de délai (SLA) ─────────────────────────
  const slaRules: Array<{ priority: Priority; targetHours: number }> = [
    { priority: Priority.CRITIQUE, targetHours: 12 },
    { priority: Priority.HAUTE, targetHours: 48 },
    { priority: Priority.MOYENNE, targetHours: 120 },
    { priority: Priority.BASSE, targetHours: 360 },
  ];
  for (const rule of slaRules) {
    await prisma.slaRule.upsert({
      where: { priority: rule.priority },
      update: {},
      create: rule,
    });
  }
  await prisma.slaSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  console.log(`${slaRules.length} règles SLA créées`);

  console.log('Seeding terminé !');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
