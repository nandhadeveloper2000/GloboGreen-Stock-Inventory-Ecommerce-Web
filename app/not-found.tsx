import AppErrorScreen from "@/components/common/AppErrorScreen";

export default function NotFoundPage() {
  return (
    <AppErrorScreen
      code="404"
      title="This page does not exist"
      description="The page you tried to open could not be found. Return to the main portal and continue from a valid page."
      homeLabel="Open main portal"
    />
  );
}
