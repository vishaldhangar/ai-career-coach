import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    const email = user.emailAddresses[0].emailAddress;
    const name = `${user.firstName} ${user.lastName}`;

    // Upsert by email — handles case where email exists with old clerkUserId
    const dbUser = await db.user.upsert({
      where: { email },
      update: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
      },
      create: {
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email,
      },
    });

    return dbUser;
  } catch (error) {
    console.log(error.message);
  }
};
