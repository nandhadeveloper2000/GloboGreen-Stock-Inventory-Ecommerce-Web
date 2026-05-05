import PurchaseReturnViewPage from "@/components/purchasereturn/view";

export default async function ShopOwnerPurchaseReturnViewPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const id = Array.isArray(resolvedSearchParams.id)
    ? resolvedSearchParams.id[0] || ""
    : resolvedSearchParams.id || "";

  return <PurchaseReturnViewPage id={id} />;
}
