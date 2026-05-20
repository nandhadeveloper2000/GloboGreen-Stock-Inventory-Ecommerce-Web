import StockTransferListPage from "@/components/stock-transfers/list";

export default function Page() {
  return (
    <StockTransferListPage
      createHref="/shopmanager/stock-transfers/create"
      viewHref="/shopmanager/stock-transfers/view"
    />
  );
}
