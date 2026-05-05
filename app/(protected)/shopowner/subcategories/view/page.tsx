import { Suspense } from "react";

import MySubCategoryViewPage from "@/components/subcategories/view";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="page-shell flex items-center justify-center text-sm text-secondary-text">
          Loading subcategory details...
        </div>
      }
    >
      <MySubCategoryViewPage />
    </Suspense>
  );
}
