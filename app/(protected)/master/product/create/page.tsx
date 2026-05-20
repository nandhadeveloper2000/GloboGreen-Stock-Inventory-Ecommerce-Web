import CreateProductPage from "@/components/product/create";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const get = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v.trim() : "";
  };

  return (
    <CreateProductPage
      initialValues={{
        categoryId: get("categoryId"),
        subcategoryId: get("subcategoryId"),
        productTypeId: get("productTypeId"),
        brandId: get("brandId"),
        modelId: get("modelId"),
        itemName: get("itemName"),
      }}
    />
  );
}
