import { type ActionArgs, json } from "@remix-run/node";
import { userPrefs } from "~/cookies";

export async function action({ request }: ActionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await userPrefs.parse(cookieHeader)) || {};
  const bodyParams = await request.formData();

  if (bodyParams.get("bannerVisibility") === "hidden") {
    cookie.hideSupportBanner = true;
  }

  return json(
    { success: true },
    {
      headers: {
        "Set-Cookie": await userPrefs.serialize(cookie),
      },
    }
  );
}
