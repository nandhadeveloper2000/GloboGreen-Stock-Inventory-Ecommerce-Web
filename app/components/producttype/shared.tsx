"use client";

import Link from "next/link";

type ProductTypePlaceholderProps = {
  title: string;
  description: string;
};

export default function ProductTypePlaceholder({
  title,
  description,
}: ProductTypePlaceholderProps) {
  return (
    <main className="page-shell">
      <div className="mx-auto flex min-h-[70vh] max-w-4xl items-center justify-center">
        <section className="premium-card-solid w-full p-8 sm:p-10">
          <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Product Type
          </span>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-heading">
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-secondary-text sm:text-base">
            {description}
          </p>

          <p className="mt-4 text-sm leading-7 text-secondary-text">
            This route still existed in the app, but the matching product type
            module is not present in the current web codebase. The page now
            resolves safely instead of failing the build.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/master/product/list" className="premium-btn">
              Open Product List
            </Link>
            <Link href="/master/product/create" className="premium-btn-secondary">
              Create Product
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
