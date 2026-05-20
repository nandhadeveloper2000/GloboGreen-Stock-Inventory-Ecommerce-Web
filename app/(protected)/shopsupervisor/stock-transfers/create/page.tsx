import CreateStockTransferPage from "@/components/stock-transfers/create";

export default function Page() {
  return (
    <CreateStockTransferPage
      listHref="/shopsupervisor/stock-transfers/list"
      stockListHref="/shopowner/stock/list"
      successViewHref="/shopsupervisor/stock-transfers/view"
      successListHref="/shopsupervisor/stock-transfers/list"
    />
  );
}
