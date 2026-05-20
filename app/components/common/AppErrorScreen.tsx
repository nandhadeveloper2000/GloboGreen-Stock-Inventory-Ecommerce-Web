import Link from "next/link";

type AppErrorScreenProps = {
  code?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  homeHref?: string;
  homeLabel?: string;
};

export default function AppErrorScreen({
  code = "Something went wrong",
  title,
  description,
  actionLabel,
  onAction,
  homeHref = "/",
  homeLabel = "Back to home",
}: AppErrorScreenProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,0,139,0.25),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(22,163,74,0.20),transparent_24%),linear-gradient(180deg,#020617_0%,#0f172a_100%)]"
      />

      <section className="relative w-full max-w-2xl rounded-[30px] border border-white/15 bg-white/95 p-6 text-center shadow-[0_30px_90px_rgba(15,23,42,0.35)] backdrop-blur-md sm:p-8">
        <div className="mx-auto inline-flex min-h-12 min-w-12 items-center justify-center rounded-full bg-[#00008b]/10 px-4 text-[11px] font-black uppercase tracking-[0.25em] text-[#00008b]">
          {code}
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
          {description}
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {actionLabel && onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex h-11 min-w-40 items-center justify-center rounded-2xl bg-[#00008b] px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(0,0,139,0.25)] transition hover:bg-[#00006f]"
            >
              {actionLabel}
            </button>
          ) : null}

          <Link
            href={homeHref}
            className="inline-flex h-11 min-w-40 items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-black text-slate-800 transition hover:border-[#00008b]/30 hover:text-[#00008b]"
          >
            {homeLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}
