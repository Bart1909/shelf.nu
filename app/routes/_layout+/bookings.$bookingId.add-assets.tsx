import type { Asset, Booking, Category, Custody } from "@prisma/client";
import type {
  ActionFunctionArgs,
  LinksFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { AssetImage } from "~/components/assets/asset-image";
import { AvailabilitySelect } from "~/components/booking/availability-select";
import styles from "~/components/booking/styles.css";
import { List } from "~/components/list";
import { AddAssetForm } from "~/components/location/add-asset-form";
import { Button } from "~/components/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/shared/tooltip";
import { Td } from "~/components/table";
import { getPaginatedAndFilterableAssets } from "~/modules/asset";
import { requireAuthSession } from "~/modules/auth";
import { getBooking, removeAssets, upsertBooking } from "~/modules/booking";
import { requireOrganisationId } from "~/modules/organization/context.server";
import { assertIsPost, getRequiredParam, tw } from "~/utils";
import { ShelfStackError } from "~/utils/error";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const authSession = await requireAuthSession(request);
  const { organizationId } = await requireOrganisationId(authSession, request);
  const id = getRequiredParam(params, "bookingId");
  const {
    search,
    totalAssets,
    perPage,
    page,
    prev,
    next,
    categories,
    tags,
    assets,
    totalPages,
  } = await getPaginatedAndFilterableAssets({
    request,
    organizationId,
  });

  const modelName = {
    singular: "asset",
    plural: "assets",
  };
  const booking = await getBooking({ id });
  if (!booking) {
    throw new ShelfStackError({ message: "Booking not found" });
  }

  return json({
    showModal: true,
    booking,
    items: assets,
    categories,
    tags,
    search,
    page,
    totalItems: totalAssets,
    perPage,
    totalPages,
    next,
    prev,
    modelName,
  });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  assertIsPost(request);
  await requireAuthSession(request);
  const bookingId = getRequiredParam(params, "bookingId");
  const formData = await request.formData();
  const assetId = formData.get("assetId") as string;
  const isChecked = formData.get("isChecked") === "yes";

  if (isChecked) {
    await upsertBooking({
      id: bookingId,
      assetIds: [assetId],
    });
  } else {
    await removeAssets({
      id: bookingId,
      assetIds: [assetId],
    });
  }

  return json({ ok: true });
};

export default function AddAssetsToNewBooking() {
  const { booking } = useLoaderData<typeof loader>();
  return (
    <div>
      <header className="mb-5">
        <h2>Move assets to ‘{booking?.name}’ booking</h2>
        <p>Fill up the booking with the assets of your choice</p>
      </header>
      {/**
       * @TODO the search is not working properly its completely cracked.
       * We have to rework it with new strategy using useSearchParams
       */}
      {/* <Filters></Filters> */}

      <div className="mb-2">
        <AvailabilitySelect />
      </div>
      <List
        ItemComponent={RowComponent}
        className="mb-8"
        customEmptyStateContent={{
          title: "You haven't added any assets yet.",
          text: "What are you waiting for? Create your first asset now!",
          newButtonRoute: "/assets/new",
          newButtonContent: "New asset",
        }}
      />
      <Button variant="secondary" width="full" to={".."}>
        Close
      </Button>
    </div>
  );
}

export type AssetWithBooking = Asset & {
  bookings: Booking[];
  custody: Custody | null;
  category: Category;
};

const RowComponent = ({ item }: { item: AssetWithBooking }) => {
  const { booking } = useLoaderData<typeof loader>();
  const isChecked =
    booking?.assets.some((asset) => asset.id === item.id) ?? false;

  return (
    <>
      <Td className="w-full p-0 md:p-0">
        <div className="flex justify-between gap-3 p-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center">
              <AssetImage
                asset={{
                  assetId: item.id,
                  mainImage: item.mainImage,
                  mainImageExpiration: item.mainImageExpiration,
                  alt: item.title,
                }}
                className="h-full w-full rounded-[4px] border object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="font-medium">{item.title}</div>
            </div>
          </div>
        </div>
      </Td>

      <Td className="text-right">
        <AvailabilityLabel asset={item} isChecked={isChecked} />
      </Td>

      <Td>
        <AddAssetForm assetId={item.id} isChecked={isChecked} />
      </Td>
    </>
  );
};

/**
 * There are 3 reasons an asset can be unavailable:
 * 1. Its marked as not allowed for booking
 * 2. It is already in custody
 * 3. It is already booked for that period (within current or another booking)
 *
 * Each reason has its own tooltip and label
 */
export function AvailabilityLabel({
  asset,
  isChecked,
}: {
  asset: AssetWithBooking;
  isChecked: boolean;
}) {
  /**
   * Marked as not allowed for booking
   */

  if (!asset.availableToBook) {
    return (
      <AvailabilityBadge
        badgeText={"Unavailable"}
        tooltipTitle={"Asset is unavailable for bookings"}
        tooltipContent={
          "This asset is marked as unavailable for bookings by an administrator."
        }
      />
    );
  }

  /**
   * Has custody
   */
  if (asset.custody) {
    return (
      <AvailabilityBadge
        badgeText={"In custody"}
        tooltipTitle={"Asset is in custody"}
        tooltipContent={
          "This asset is in custody of a team member making it currently unavailable for bookings."
        }
      />
    );
  }

  /**
   * Is booked for period
   */
  if (asset.bookings?.length > 0 && !isChecked) {
    return (
      <AvailabilityBadge
        badgeText={"Already booked"}
        tooltipTitle={"Asset is already part of a booking"}
        tooltipContent={
          "This asset is added to a booking that is overlapping the selected time period."
        }
      />
    );
  }

  return null;
}

export function AvailabilityBadge({
  badgeText,
  tooltipTitle,
  tooltipContent,
}: {
  badgeText: string;
  tooltipTitle: string;
  tooltipContent: string;
}) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={tw(
              "inline-block bg-warning-50 px-[6px] py-[2px]",
              "rounded-md border border-warning-200",
              "text-xs text-warning-700"
            )}
          >
            {badgeText}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <div className="max-w-[260px] text-left sm:max-w-[320px]">
            <h6 className="mb-1 text-xs font-semibold text-gray-700">
              {tooltipTitle}
            </h6>
            <div className="whitespace-normal text-xs font-medium text-gray-500">
              {tooltipContent}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
