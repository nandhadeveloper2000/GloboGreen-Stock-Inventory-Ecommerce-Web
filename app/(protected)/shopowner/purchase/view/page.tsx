import PurchaseViewPage from "@/components/purchase/view";

export default async function ShopOwnerPurchaseViewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const id = Array.isArray(resolvedSearchParams.id)
    ? resolvedSearchParams.id[0] || ""
    : resolvedSearchParams.id || "";

  return <PurchaseViewPage id={id} />;
}
