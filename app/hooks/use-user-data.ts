import type { User } from "@prisma/client";
import { redirect } from "@remix-run/node";

import { useMatchesData } from "./use-matches-data";

/**
 * This base hook is used to access the user data from within the _layout route
 * @returns {User|undefined} The router data or undefined if not found
 */
export function useUserData(): User | undefined {
  let user = useMatchesData<{ user: User }>("routes/_layout+/_layout")?.user;

  if (!user) {
    redirect("/login");
  }
  return user;
}
