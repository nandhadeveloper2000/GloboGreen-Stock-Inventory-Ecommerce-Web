import CreateStockTransferPage from "@/components/stock-transfers/create";

export default function Page() {
  return (
    <CreateStockTransferPage
      listHref="/shopmanager/stock-transfers/list"
      stockListHref="/shopowner/stock/list"
      successViewHref="/shopmanager/stock-transfers/view"
      successListHref="/shopmanager/stock-transfers/list"
    />
  );
}
