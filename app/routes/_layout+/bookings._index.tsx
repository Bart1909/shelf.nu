import type { Prisma, BookingStatus } from "@prisma/client";
import type { MetaFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useNavigate } from "@remix-run/react";
import { StatusFilter } from "~/components/booking/status-filter";

import { ChevronRight } from "~/components/icons";
import Header from "~/components/layout/header";
import type { HeaderData } from "~/components/layout/header/types";
import { Filters, List } from "~/components/list";
import { Badge, Button } from "~/components/shared";
import { Td, Th } from "~/components/table";
import { commitAuthSession, requireAuthSession } from "~/modules/auth";
import { getBookings } from "~/modules/booking";
import {
  requireOrganisationId,
  setSelectedOrganizationIdCookie,
} from "~/modules/organization/context.server";
import {
  generatePageMeta,
  getCurrentSearchParams,
  getParamsValues,
} from "~/utils";
import { appendToMetaTitle } from "~/utils/append-to-meta-title";
import { getDateTimeFormat } from "~/utils/client-hints";
import {
  setCookie,
  updateCookieWithPerPage,
  userPrefs,
} from "~/utils/cookies.server";
import { AvailabilityBadge } from "./bookings.$bookingId.add-assets";

export async function loader({ request }: LoaderFunctionArgs) {
  const authSession = await requireAuthSession(request);
  const { organizationId } = await requireOrganisationId(authSession, request);
  const searchParams = getCurrentSearchParams(request);
  const { page, perPageParam, search, status } = getParamsValues(searchParams);
  const cookie = await updateCookieWithPerPage(request, perPageParam);
  const { perPage } = cookie;

  const { prev, next } = generatePageMeta(request);

  const { bookings, bookingCount } = await getBookings({
    organizationId,
    page,
    perPage,
    search,
    ...(status && {
      // If status is in the params, we filter based on it
      statuses: [status],
    }),
  });

  const totalPages = Math.ceil(bookingCount / perPage);

  const header: HeaderData = {
    title: "Bookings",
  };
  const modelName = {
    singular: "booking",
    plural: "bookings",
  };

  /** We format the dates on the server based on the users timezone and locale  */
  const items = bookings.map((b) => {
    if (b.from && b.to) {
      const from = new Date(b.from);
      const displayFrom = getDateTimeFormat(request, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(from);

      const to = new Date(b.to);
      const displayTo = getDateTimeFormat(request, {
        dateStyle: "short",
        timeStyle: "short",
      }).format(to);

      return {
        ...b,
        displayFrom: displayFrom.split(","),
        displayTo: displayTo.split(","),
      };
    }
    return b;
  });

  return json(
    {
      header,
      items,
      search,
      page,
      totalItems: bookings.length,
      totalPages,
      perPage,
      prev,
      next,
      modelName,
    },
    {
      headers: [
        setCookie(await userPrefs.serialize(cookie)),
        setCookie(await commitAuthSession(request, { authSession })),
        setCookie(await setSelectedOrganizationIdCookie(organizationId)),
      ],
    }
  );
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? appendToMetaTitle(data.header.title) : "" },
];

export default function BookingsIndexPage() {
  const navigate = useNavigate();
  return (
    <>
      <Header>
        <Button
          to="new"
          role="link"
          aria-label={`new booking`}
          data-test-id="createNewBooking"
        >
          New booking
        </Button>
      </Header>
      <div className="mt-8 flex flex-1 flex-col md:mx-0 md:gap-2">
        <Filters className="mb-2">
          <StatusFilter />
        </Filters>
        <List
          ItemComponent={ListAssetContent}
          navigate={(id) => navigate(id)}
          className=" overflow-x-visible md:overflow-x-auto"
          headerChildren={
            <>
              <Th className="hidden md:table-cell"> </Th>
              <Th className="hidden md:table-cell">From</Th>
              <Th className="hidden md:table-cell">To</Th>
              <Th className="hidden md:table-cell">Custodian</Th>
            </>
          }
        />
      </div>
    </>
  );
}

export const bookingStatusColorMap: { [key in BookingStatus]: string } = {
  DRAFT: "#667085",
  RESERVED: "#175CD3",
  ONGOING: "#7A5AF8",
  OVERDUE: "#B54708",
  COMPLETE: "#17B26A",
  ARCHIVED: "#667085",
  CANCELLED: "#667085",
};

const ListAssetContent = ({
  item,
}: {
  item: Prisma.BookingGetPayload<{
    include: {
      assets: {
        select: {
          id: true;
          availableToBook: true;
          custody: true;
        };
      };
      from: true;
      to: true;
      custodianUser: true;
      custodianTeamMember: true;
    };
  }> & {
    displayFrom?: string[];
    displayTo?: string[];
  };
}) => {
  // @TODO - here we miss some cases
  const hasUnavaiableAssets = item.assets.some(
    (asset) => !asset.availableToBook || asset.custody !== null
  );
  return (
    <>
      {/* Item */}
      <Td className="w-full whitespace-normal p-0 md:p-0">
        <div className="flex justify-between gap-3 p-4 md:justify-normal md:px-6">
          <div className="flex items-center gap-3">
            <div className="min-w-[130px]">
              <span className="word-break mb-1 block font-medium">
                {item.name}
              </span>
              <div className="">
                <Badge color={bookingStatusColorMap[item.status]}>
                  <span className="block lowercase first-letter:uppercase">
                    {item.status}
                  </span>
                </Badge>
              </div>
            </div>
          </div>

          <button className="block md:hidden">
            <ChevronRight />
          </button>
        </div>
      </Td>

      {/**
       * Optional label when the booking inlcudes assets that are either:
       * 1. Marked as not available for boooking
       * 2. Have custody
       * 3. Have other bookings with the same period - this I am not sure how to handle yet
       * */}
      <Td className="hidden md:table-cell">
        {hasUnavaiableAssets ? (
          <AvailabilityBadge
            badgeText={"Inlcudes unavailable assets"}
            tooltipTitle={"Booking includes unavailable assets"}
            tooltipContent={
              "There are some assets within this booking that are unavailable for reservation becuase they are checked-out, have custody assigned or are marked as not allowed to book"
            }
          />
        ) : null}
      </Td>

      {/* From */}
      <Td className="hidden md:table-cell">
        {item.displayFrom ? (
          <div className="min-w-[130px]">
            <span className="word-break mb-1 block font-medium">
              {item.displayFrom[0]}
            </span>
            <span className="block text-gray-600">{item.displayFrom[1]}</span>
          </div>
        ) : null}
      </Td>

      {/* To */}
      <Td className="hidden md:table-cell">
        {item.displayTo ? (
          <div className="min-w-[130px]">
            <span className="word-break mb-1 block font-medium">
              {item.displayTo[0]}
            </span>
            <span className="block text-gray-600">{item.displayTo[1]}</span>
          </div>
        ) : null}
      </Td>

      {/* Custodian */}
      <Td className="hidden md:table-cell">
        {item?.custodianUser ? (
          <CustodianColumn
            img={
              item?.custodianUser?.profilePicture || "/images/default_pfp.jpg"
            }
            name={`${item?.custodianUser.firstName} ${item?.custodianUser.lastName}`}
          />
        ) : item?.custodianTeamMember ? (
          <CustodianColumn name={item.custodianTeamMember.name} />
        ) : null}
      </Td>
    </>
  );
};

function CustodianColumn({ img, name }: { img?: string; name: string }) {
  return (
    <span className="inline-flex w-max items-center justify-center rounded-2xl bg-gray-100 px-2 py-[2px] text-center text-[12px] font-medium text-gray-700">
      <img
        src={img || "/images/default_pfp.jpg"}
        className="mr-1 h-4 w-4 rounded-full"
        alt=""
      />
      <span className="mt-[1px]">{name}</span>
    </span>
  );
}

export type BookingWithCustodians = Prisma.BookingGetPayload<{
  include: {
    assets: true;
    from: true;
    to: true;
    custodianUser: true;
    custodianTeamMember: true;
  };
}>;
