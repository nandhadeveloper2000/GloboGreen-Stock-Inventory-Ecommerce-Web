import { redirect } from "next/navigation";

export default async function StorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const shopId = typeof params.shopId === "string" ? params.shopId : "";
  redirect(`/store/products${shopId ? `?shopId=${shopId}` : ""}`);
}
