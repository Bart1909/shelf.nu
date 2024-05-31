import { BookingStatus, type Kit } from "@prisma/client";
import { useLoaderData, useNavigation, useParams } from "@remix-run/react";
import { useAtom } from "jotai";
import {
  bookingsSelectedAssetsAtom,
  bookingsSelectedKitsAtom,
} from "~/atoms/selected-assets-atoms";
import type { IndexResponse } from "~/routes/_layout+/assets._index";
import { isFormProcessing } from "~/utils/form";
import { tw } from "~/utils/tw";
import { groupBy } from "~/utils/utils";
import { AvailabilityBadge } from "../booking/availability-label";
import { FakeCheckbox } from "../forms/fake-checkbox";
import KitImage from "../kits/kit-image";
import { EmptyState } from "../list/empty-state";
import { ListItem } from "../list/list-item";
import { Spinner } from "../shared/spinner";
import { Table, Td } from "../table";

type GroupedByKitAssetsProps = {
  className?: string;
  style?: React.CSSProperties;
};

export default function GroupedByKitAssets({
  className,
  style,
}: GroupedByKitAssetsProps) {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { items } = useLoaderData<IndexResponse>();
  const hasItems = items.length > 0;

  const navigation = useNavigation();
  const isLoading = isFormProcessing(navigation.state);

  const [, setSelectedAssets] = useAtom(bookingsSelectedAssetsAtom);

  const [selectedKits, setSelectedKits] = useAtom(bookingsSelectedKitsAtom);

  const groupedItems = groupBy(items ?? [], (item) => item?.kit?.id);

  function handleKitAndAssetSelection({
    isKitSelected,
    assetIds,
    kitId,
  }: {
    isKitSelected: boolean;
    kitId: string;
    assetIds: string[];
  }) {
    /** Handling selection of asset for booking */
    setSelectedAssets((prevSelected) => {
      if (isKitSelected) {
        return prevSelected.filter((asset) => !assetIds.includes(asset));
      }

      return [...prevSelected, ...assetIds];
    });

    /** Handling selection of kit for booking (so that we can show the count asset and kits)  */
    setSelectedKits((prevSelected) =>
      prevSelected.includes(kitId)
        ? prevSelected.filter((id) => id !== kitId)
        : [...prevSelected, kitId]
    );
  }

  if (isLoading && !navigation?.formAction) {
    return (
      <div className="flex h-[400px] flex-1 flex-col items-center justify-center">
        <Spinner />
        <p>Fetching kits...</p>
      </div>
    );
  }

  return (
    <div
      className={tw(
        "overflow-x-auto border-gray-200 bg-white md:mx-0 md:rounded",
        className
      )}
      style={style}
    >
      {!hasItems ? (
        <EmptyState
          className="py-10"
          customContent={{
            title: "You haven't created any kits yet.",
            text: "What are you waiting for? Create your first kit now!",
            newButtonRoute: "/kits/new",
            newButtonContent: "New kit",
          }}
        />
      ) : (
        <>
          <Table>
            <tbody>
              {Object.values(groupedItems).map((assets) => {
                const kit = assets[0].kit as Kit;
                if (!kit || !assets.length) {
                  return null;
                }

                const assetNotAvailable = assets.some(
                  (a) => a.status !== "AVAILABLE"
                );
                const disallowedBookingStatus: BookingStatus[] = [
                  BookingStatus.ONGOING,
                  BookingStatus.OVERDUE,
                  BookingStatus.RESERVED,
                ];
                const kitBookings =
                  assets.find((a) => a.bookings.length > 0)?.bookings ?? [];

                const hasDisallowedBookings = kitBookings.some(
                  (b: { status: BookingStatus }) =>
                    disallowedBookingStatus.includes(b.status)
                );
                const currentBooking = kitBookings.find(
                  (b: { id: string }) => b.id === bookingId
                );

                const assetHasUnavailableBooking =
                  hasDisallowedBookings && !currentBooking;
                const isKitNotAvailable =
                  assetNotAvailable || assetHasUnavailableBooking;

                const assetIds = assets.map((a) => a.id);
                const isKitSelected = selectedKits.includes(kit.id);

                return (
                  <ListItem
                    item={kit}
                    key={kit.id}
                    navigate={() => {
                      if (isKitNotAvailable) {
                        return;
                      }

                      handleKitAndAssetSelection({
                        isKitSelected,
                        kitId: kit.id,
                        assetIds,
                      });
                    }}
                  >
                    <Td className="w-full p-0 md:p-0">
                      <div className="flex justify-between gap-3 p-4 md:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex size-12 shrink-0 items-center justify-center">
                            <KitImage
                              kit={{
                                kitId: kit.id,
                                image: kit.image,
                                imageExpiration: kit.imageExpiration,
                                alt: kit.name,
                              }}
                              className="size-full rounded-[4px] border object-cover"
                            />
                          </div>
                          <div className="flex flex-col">
                            <p className="word-break whitespace-break-spaces font-medium">
                              {kit.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              {assets.length} assets
                            </p>
                          </div>
                        </div>
                      </div>
                    </Td>

                    <Td>
                      {isKitNotAvailable ? (
                        <AvailabilityBadge
                          badgeText="Includes unavailable assets"
                          tooltipTitle="Includes asset(s) that are unavailable for bookings"
                          tooltipContent="One or more assets in this kit are marked as unavailable for bookings. Make them available for bookings or remove the asset(s) from the kit."
                        />
                      ) : null}
                    </Td>

                    <Td>
                      <FakeCheckbox
                        className={tw(
                          "text-white",
                          isKitNotAvailable ? "text-gray-100" : "",
                          isKitSelected ? "text-primary" : ""
                        )}
                        checked={isKitSelected}
                      />
                    </Td>
                  </ListItem>
                );
              })}
            </tbody>
          </Table>
        </>
      )}
    </div>
  );
}
