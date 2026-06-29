import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const users: Array<{
    email: string;
    password: string;
    role: Role;
    isActive: boolean;
  }> = [
    {
      email: 'admin@example.com',
      password: 'Admin123!',
      role: Role.ADMIN,
      isActive: true,
    },
    {
      email: 'manager@example.com',
      password: 'Manager123!',
      role: Role.MANAGER,
      isActive: true,
    },
    {
      email: 'analyst@example.com',
      password: 'Analyst123!',
      role: Role.ANALYST,
      isActive: true,
    },
    {
      email: 'inactive@example.com',
      password: 'Inactive123!',
      role: Role.ANALYST,
      isActive: false,
    },
  ];

  for (const userData of users) {
    const passwordHash = await argon2.hash(userData.password);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash,
        role: userData.role,
        isActive: userData.isActive,
      },
      create: {
        email: userData.email,
        passwordHash,
        role: userData.role,
        isActive: userData.isActive,
      },
    });
    console.log(`Upserted user: ${userData.email} (${userData.role})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
