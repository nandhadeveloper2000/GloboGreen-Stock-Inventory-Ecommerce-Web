import SalesViewPage from "@/components/sales/view";

export default async function ShopOwnerSalesViewPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string | string[] | undefined;
    print?: string | string[] | undefined;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const id = Array.isArray(resolvedSearchParams.id)
    ? resolvedSearchParams.id[0] || ""
    : resolvedSearchParams.id || "";
  const print = Array.isArray(resolvedSearchParams.print)
    ? resolvedSearchParams.print[0] === "1"
    : resolvedSearchParams.print === "1";

  return <SalesViewPage id={id} autoPrint={print} />;
}
