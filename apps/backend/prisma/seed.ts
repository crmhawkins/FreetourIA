import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.tourHistory.deleteMany();
  await prisma.rating.deleteMany();
  await prisma.contentCache.deleteMany();
  await prisma.groupSession.deleteMany();
  await prisma.pointOfInterest.deleteMany();
  await prisma.route.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const hashedPassword = await bcrypt.hash('Demo1234', 10);
  const user = await prisma.user.create({
    data: {
      email: 'demo@freetour.ai',
      password: hashedPassword,
      name: 'Demo User',
    },
  });
  console.log(`✅ Created user: ${user.email}`);

  // --- MADRID ---
  const madridRoute = await prisma.route.create({
    data: {
      name: 'Madrid Centro Histórico',
      description: 'Descubre los rincones más emblemáticos del centro histórico de Madrid, desde la Puerta del Sol hasta el Palacio Real, pasando por la Plaza Mayor.',
      city: 'Madrid',
      difficulty: 'EASY',
      estimatedDuration: 120,
      distance: 3.2,
      tags: ['historia', 'arquitectura', 'clásica', 'centro'],
      points: {
        create: [
          {
            orderIndex: 0,
            name: 'Puerta del Sol',
            description: 'El kilómetro cero de España y el corazón de Madrid.',
            latitude: 40.4169,
            longitude: -3.7035,
            stableId: 'MADRID_PUERTA_SOL',
          },
          {
            orderIndex: 1,
            name: 'Plaza Mayor',
            description: 'La plaza central de Madrid, construida en el siglo XVII.',
            latitude: 40.4154,
            longitude: -3.7074,
            stableId: 'MADRID_PLAZA_MAYOR',
          },
          {
            orderIndex: 2,
            name: 'Mercado de San Miguel',
            description: 'Mercado modernista del siglo XX con deliciosas tapas.',
            latitude: 40.4151,
            longitude: -3.7087,
            stableId: 'MADRID_MERCADO_SAN_MIGUEL',
          },
          {
            orderIndex: 3,
            name: 'Palacio Real',
            description: 'La residencia oficial de la Familia Real española.',
            latitude: 40.4179,
            longitude: -3.7143,
            stableId: 'MADRID_PALACIO_REAL',
          },
          {
            orderIndex: 4,
            name: 'Plaza de Oriente',
            description: 'Elegante plaza con la estatua ecuestre de Felipe IV.',
            latitude: 40.4182,
            longitude: -3.7133,
            stableId: 'MADRID_PLAZA_ORIENTE',
          },
        ],
      },
    },
  });

  const madridArteRoute = await prisma.route.create({
    data: {
      name: 'Madrid Triángulo del Arte',
      description: 'El mejor arte del mundo concentrado en pocos metros. El Prado, el Reina Sofía y el Thyssen-Bornemisza.',
      city: 'Madrid',
      difficulty: 'EASY',
      estimatedDuration: 180,
      distance: 1.8,
      tags: ['arte', 'museos', 'cultura', 'impresionismo'],
      points: {
        create: [
          {
            orderIndex: 0,
            name: 'Museo del Prado',
            description: 'Uno de los museos de arte más importantes del mundo.',
            latitude: 40.4138,
            longitude: -3.6920,
            stableId: 'MADRID_PRADO',
          },
          {
            orderIndex: 1,
            name: 'Parque del Retiro',
            description: 'El pulmón verde de Madrid, con su famoso estanque.',
            latitude: 40.4153,
            longitude: -3.6844,
            stableId: 'MADRID_RETIRO',
          },
          {
            orderIndex: 2,
            name: 'Museo Thyssen-Bornemisza',
            description: 'Una de las mejores colecciones privadas de arte del mundo.',
            latitude: 40.4150,
            longitude: -3.6939,
            stableId: 'MADRID_THYSSEN',
          },
          {
            orderIndex: 3,
            name: 'Museo Reina Sofía',
            description: 'Arte contemporáneo y el Guernica de Picasso.',
            latitude: 40.4083,
            longitude: -3.6946,
            stableId: 'MADRID_REINA_SOFIA',
          },
        ],
      },
    },
  });

  // --- BARCELONA ---
  const barcelonaRoute = await prisma.route.create({
    data: {
      name: 'Barcelona Gaudí Essencial',
      description: 'Los monumentos más impresionantes del genio modernista Antoni Gaudí en Barcelona.',
      city: 'Barcelona',
      difficulty: 'MEDIUM',
      estimatedDuration: 150,
      distance: 4.5,
      tags: ['modernismo', 'arquitectura', 'gaudí', 'patrimonio UNESCO'],
      points: {
        create: [
          {
            orderIndex: 0,
            name: 'Sagrada Família',
            description: 'La obra maestra inacabada de Antoni Gaudí, símbolo de Barcelona.',
            latitude: 41.4036,
            longitude: 2.1744,
            stableId: 'BCN_SAGRADA_FAMILIA',
          },
          {
            orderIndex: 1,
            name: 'Park Güell',
            description: 'Jardines y arquitectura modernista con vistas panorámicas de Barcelona.',
            latitude: 41.4145,
            longitude: 2.1527,
            stableId: 'BCN_PARK_GUELL',
          },
          {
            orderIndex: 2,
            name: 'Casa Batlló',
            description: 'Una de las obras más conocidas de Gaudí en el Passeig de Gràcia.',
            latitude: 41.3916,
            longitude: 2.1649,
            stableId: 'BCN_CASA_BATLLO',
          },
          {
            orderIndex: 3,
            name: 'Casa Milà (La Pedrera)',
            description: 'El último trabajo civil de Gaudí, con su famosa azotea de chimeneas.',
            latitude: 41.3954,
            longitude: 2.1619,
            stableId: 'BCN_CASA_MILA',
          },
        ],
      },
    },
  });

  const barcelonaGoticoRoute = await prisma.route.create({
    data: {
      name: 'Barcelona Barrio Gótico',
      description: 'Pasea por las callejuelas medievales del barrio más antiguo de Barcelona, lleno de historia romana y medieval.',
      city: 'Barcelona',
      difficulty: 'EASY',
      estimatedDuration: 90,
      distance: 2.0,
      tags: ['medieval', 'historia', 'paseo', 'romano'],
      points: {
        create: [
          {
            orderIndex: 0,
            name: 'Catedral de Barcelona',
            description: 'La Catedral de la Santa Cruz y Santa Eulalia, joya del gótico catalán.',
            latitude: 41.3840,
            longitude: 2.1766,
            stableId: 'BCN_CATEDRAL',
          },
          {
            orderIndex: 1,
            name: 'Plaça de Sant Jaume',
            description: 'Centro político de la ciudad, sede del Ayuntamiento y la Generalitat.',
            latitude: 41.3825,
            longitude: 2.1769,
            stableId: 'BCN_PLACA_SANT_JAUME',
          },
          {
            orderIndex: 2,
            name: 'Pont del Bisbe',
            description: 'El famoso puente neogótico que conecta el Palau de la Generalitat.',
            latitude: 41.3822,
            longitude: 2.1763,
            stableId: 'BCN_PONT_BISBE',
          },
          {
            orderIndex: 3,
            name: 'Plaça Reial',
            description: 'Animada plaza con farolas diseñadas por el joven Gaudí.',
            latitude: 41.3798,
            longitude: 2.1759,
            stableId: 'BCN_PLACA_REIAL',
          },
        ],
      },
    },
  });

  // --- ROME ---
  const romeRoute = await prisma.route.create({
    data: {
      name: 'Rome Classic - Ancient City',
      description: 'Walk through 2,000 years of history in the Eternal City. From the Colosseum to the Trevi Fountain.',
      city: 'Rome',
      difficulty: 'MEDIUM',
      estimatedDuration: 180,
      distance: 5.0,
      tags: ['ancient', 'history', 'architecture', 'unesco'],
      points: {
        create: [
          {
            orderIndex: 0,
            name: 'Colosseum',
            description: 'The iconic amphitheater of ancient Rome, symbol of the city.',
            latitude: 41.8902,
            longitude: 12.4922,
            stableId: 'ROME_COLOSSEUM',
          },
          {
            orderIndex: 1,
            name: 'Roman Forum',
            description: 'The heart of ancient Roman public life for centuries.',
            latitude: 41.8925,
            longitude: 12.4853,
            stableId: 'ROME_FORUM',
          },
          {
            orderIndex: 2,
            name: 'Trevi Fountain',
            description: 'The largest Baroque fountain in Rome and one of the most famous in the world.',
            latitude: 41.9009,
            longitude: 12.4833,
            stableId: 'ROME_TREVI',
          },
          {
            orderIndex: 3,
            name: 'Pantheon',
            description: 'The best-preserved ancient Roman building, dedicated to all the gods.',
            latitude: 41.8986,
            longitude: 12.4769,
            stableId: 'ROME_PANTHEON',
          },
          {
            orderIndex: 4,
            name: 'Piazza Navona',
            description: 'Stunning Baroque square built on the site of the ancient Stadium of Domitian.',
            latitude: 41.8992,
            longitude: 12.4730,
            stableId: 'ROME_PIAZZA_NAVONA',
          },
        ],
      },
    },
  });

  // Add ratings
  await prisma.rating.createMany({
    data: [
      { routeId: madridRoute.id, userId: user.id, rating: 5, comment: 'Increíble ruta, muy bien explicada' },
      { routeId: barcelonaRoute.id, rating: 5, comment: 'La Sagrada Família es impresionante' },
      { routeId: barcelonaRoute.id, rating: 4, comment: 'Muy buena experiencia' },
      { routeId: romeRoute.id, rating: 5, comment: 'Rome is absolutely stunning!' },
      { routeId: romeRoute.id, rating: 4, comment: 'Great tour, very informative' },
      { routeId: madridArteRoute.id, userId: user.id, rating: 5, comment: 'El Prado es de otro nivel' },
    ],
  });

  console.log('✅ Created routes:', [
    madridRoute.name,
    madridArteRoute.name,
    barcelonaRoute.name,
    barcelonaGoticoRoute.name,
    romeRoute.name,
  ].join(', '));

  console.log('🎉 Database seeded successfully!');
  console.log('📧 Demo login: demo@freetour.ai / Demo1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
