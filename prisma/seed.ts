import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@certindo.co.id').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name: 'Administrator Certindo', role: UserRole.ADMIN },
    create: { name: 'Administrator Certindo', email, passwordHash, role: UserRole.ADMIN },
  });

  await prisma.company.upsert({
    where: { id: 'sample-company-certindo' },
    update: {},
    create: {
      id: 'sample-company-certindo',
      name: 'PT Certindonesia',
      address: 'Indonesia',
      email: 'info@certindo.co.id',
    },
  });
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
