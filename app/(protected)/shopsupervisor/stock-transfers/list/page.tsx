import StockTransferListPage from "@/components/stock-transfers/list";

export default function Page() {
  return (
    <StockTransferListPage
      createHref="/shopsupervisor/stock-transfers/create"
      viewHref="/shopsupervisor/stock-transfers/view"
    />
  );
}
