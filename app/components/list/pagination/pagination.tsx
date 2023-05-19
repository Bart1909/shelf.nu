import { useMemo } from "react";
import { Button } from "~/components/shared/button";
import { PageNumber } from "./page-number";

export const Pagination = ({
  page,
  totalItems,
  totalPages,
  perPage,
  next,
  prev,
}: {
  totalItems: number;
  perPage: number;
  page: number;
  totalPages: number;
  next: string;
  prev: string;
}) => {
  // const { page, totalItems, totalPages, perPage, next, prev } =
  //   useLoaderData<IndexResponse>();

  const pageNumbers = useMemo(() => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }, [totalPages]);

  const { prevDisabled, nextDisabled } = useMemo(
    () => ({
      prevDisabled: totalPages <= 1 || page <= 1,
      nextDisabled: totalPages <= 1 || page * perPage >= totalItems,
    }),
    [page, totalPages, perPage, totalItems]
  );

  return (
    <div className="flex items-center justify-between border-t px-6 py-[18px]">
      <Button variant="secondary" size="sm" to={prev} disabled={prevDisabled}>
        {"< Previous"}
      </Button>

      <ul className="flex gap-[2px]">
        {pageNumbers.map((pageNumber) => (
          <PageNumber number={pageNumber} key={pageNumber} />
        ))}
      </ul>

      <Button variant="secondary" size="sm" to={next} disabled={nextDisabled}>
        {"Next >"}
      </Button>
    </div>
  );
};
