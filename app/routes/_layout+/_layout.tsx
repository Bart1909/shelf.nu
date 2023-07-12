import { Roles } from "@prisma/client";
import type {
  LinksFunction,
  LoaderArgs,
  LoaderFunction,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Outlet } from "@remix-run/react";
import { ErrorBoundryComponent } from "~/components/errors";
import { Breadcrumbs } from "~/components/layout/breadcrumbs";
import Sidebar from "~/components/layout/sidebar/sidebar";
import { useCrisp } from "~/components/marketing/crisp";
import { Toaster } from "~/components/shared/toast";
import { userPrefs } from "~/cookies";
import { db } from "~/database";
import { requireAuthSession } from "~/modules/auth";
import styles from "~/styles/layout/index.css";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const loader: LoaderFunction = async ({ request }: LoaderArgs) => {
  const authSession = await requireAuthSession(request);

  const user = authSession
    ? await db.user.findUnique({
        where: { email: authSession.email.toLowerCase() },
        include: { roles: true },
      })
    : undefined;
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await userPrefs.parse(cookieHeader)) || {};
  if (!user?.onboarded) {
    return redirect("onboarding");
  }

  return json({
    user,
    hideSupportBanner: cookie.hideSupportBanner,
    isAdmin: user?.roles.some((role) => role.name === Roles["ADMIN"]),
  });
};

export default function App() {
  useCrisp();

  return (
    <div id="container" className="flex min-h-screen min-w-[320px] flex-col">
      <div className="flex flex-col md:flex-row">
        <Sidebar />
        <main className=" flex-1 bg-gray-25 px-4 py-8 md:w-[calc(100%-312px)] md:px-8">
          <div className="flex h-full flex-1 flex-col">
            <Breadcrumbs />
            <Outlet />
          </div>
          <Toaster />
        </main>
      </div>
    </div>
  );
}

export const ErrorBoundary = () => (
  <ErrorBoundryComponent title="Sorry, page you are looking for doesn't exist" />
);
