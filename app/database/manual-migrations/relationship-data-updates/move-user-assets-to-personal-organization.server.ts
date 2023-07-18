/* eslint-disable no-console */
import { OrganizationType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  try {
    // console.log(`Total of ${allUsers.length} users' roles updated`);
    const allUsers = await prisma.user.findMany({
      include: {
        organizations: true,
        assets: {
          include: {
            organization: true,
          },
        },
      },
    });

    allUsers.map(async (user) => {
      user.assets.map(async (asset) => {
        if (asset.organizationId) return;
        return await prisma.asset.update({
          where: {
            id: asset.id,
          },
          data: {
            organizationId: user.organizations.find(
              (organization) => organization.type === OrganizationType.PERSONAL
            )?.id,
          },
        });
      });
    });

    console.log(
      `Assets without organizationId have been assigned to PERSONAL organization. 🌱\n`
    );
    console.log(`Database has been seeded. 🌱\n`);
  } catch (cause) {
    console.error(cause);
    throw new Error("Seed failed 🥲");
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
