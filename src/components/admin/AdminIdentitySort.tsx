import type { AdminIdentitySort as IdentitySort } from "@/lib/adminIdentityDirectory";
import { AdminDirectorySelect } from "./AdminDirectorySelect";

type Props = {
  sort: IdentitySort;
  pageHref: string;
};

const sortOptions = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name_asc", label: "Name: A–Z" },
  { value: "name_desc", label: "Name: Z–A" },
] as const;

/** Sorting submits immediately, preserving filters and resetting the page. */
export function AdminIdentitySort({ sort, pageHref }: Props) {
  const params = new URLSearchParams(pageHref.split("?")[1] || "");
  params.delete("page");
  params.delete("sort");

  return (
    <form action="/admin/users" method="get" className="min-w-[154px]">
      {[...params].map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <AdminDirectorySelect
        key={sort}
        name="sort"
        label="Sort by"
        value={sort}
        options={sortOptions}
        compact
        autoSubmit
      />
    </form>
  );
}
