/* eslint-disable no-console */
import { OrganizationType, PrismaClient } from "@prisma/client";
import { ShelfError } from "~/utils/error";

const prisma = new PrismaClient();

/**
 * Organizations, teams, custodians


Due to there being assets already existing we need to do a 2 step process

1. Make organizationId within asset to not be required
2. Create a script that creates organizations for all users and then links all assets of the user to organization
3. Make organizationId to be required

 */

async function seed() {
  try {
    // console.log(`Total of ${allUsers.length} users' roles updated`);
    const allUsers = await prisma.user.findMany({
      include: {
        organizations: true,
      },
    });

    await Promise.all(
      allUsers.map(async (user) => {
        if (
          user.organizations?.some(
            (org) => org.type === OrganizationType["PERSONAL"]
          )
        )
          return;

        return prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            organizations: {
              create: [{ name: "Personal" }],
            },
          },
        });
      })
    );
    console.log(
      `Users without a personal organization have been updated. 🌱\n`
    );
    console.log(`Database has been seeded. 🌱\n`);
  } catch (cause) {
    throw new ShelfError({
      cause,
      message: "Seed failed 🥲",
      label: "Unknown",
    });
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
