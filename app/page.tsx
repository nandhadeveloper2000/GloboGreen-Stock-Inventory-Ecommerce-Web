// app/page.tsx
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-soft">
      <div className="premium-bg-overlay absolute inset-0" />
      <div className="premium-grid-bg premium-bg-animate absolute inset-0" />

      <div className="absolute left-[-80px] top-[-80px] h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-[-100px] right-[-80px] h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl">
          <div className="premium-card premium-border overflow-hidden">
            <div className="grid min-h-[88vh] lg:grid-cols-[1.08fr_0.92fr]">
              <div className="premium-hero premium-glow relative flex flex-col justify-between overflow-hidden p-8 sm:p-10 lg:p-12">
                <div className="premium-grid-bg absolute inset-0 opacity-30" />

                <div className="relative z-10">
                  <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md">
                    <div className="relative h-8 w-8 overflow-hidden rounded-full bg-white/15 ring-1 ring-white/20">
                      <Image
                        src="/favicon.png"
                        alt="Logo"
                        fill
                        className="object-contain p-1.5"
                        priority
                      />
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.22em] text-white/90">
                      Secure Access
                    </span>
                  </div>

                  <h1 className="mt-8 max-w-xl text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
                    Choose Your
                    <span className="block text-white/85">Login Portal</span>
                  </h1>

                  <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                    Select the correct access panel to continue into your
                    workspace. Master admins manage the platform, while shop
                    owners and staff handle store operations.
                  </p>
                </div>

                <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                      Access
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      Protected Entry
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                      Portal
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      Role Based
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
                      Design
                    </p>
                    <p className="mt-2 text-base font-semibold text-white">
                      Premium UI
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative flex items-center bg-white/75 p-6 backdrop-blur-xl sm:p-8 lg:p-10">
                <div className="mx-auto w-full max-w-xl">
                  <div className="mb-8 text-center lg:text-left">
                    <span className="inline-flex rounded-full border border-primary/15 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      Welcome
                    </span>

                    <h2 className="mt-4 text-3xl font-bold tracking-tight text-heading sm:text-4xl">
                      Continue to your panel
                    </h2>

                    <p className="mt-3 text-sm leading-7 text-secondary-text sm:text-base">
                      Choose the login area based on your role and access level.
                    </p>
                  </div>

                  <div className="grid gap-5">
                    <Link
                      href="/masterlogin"
                      className="group relative overflow-hidden rounded-[28px] border border-border/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />

                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-7 w-7"
                          >
                            <path d="M12 3l7 4v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V7l7-4z" />
                            <path d="M9.5 12.5l1.5 1.5 3.5-4" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-semibold text-heading">
                            Master Login
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-secondary-text">
                            Access the master admin dashboard for central
                            control, platform setup, and management operations.
                          </p>

                          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                            Go to Master Login
                            <span className="transition-transform duration-300 group-hover:translate-x-1">
                              →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href="/shoplogin"
                      className="group relative overflow-hidden rounded-[28px] border border-border/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_20px_50px_rgba(15,23,42,0.12)]"
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-primary" />

                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-7 w-7"
                          >
                            <path d="M3 10l2-5h14l2 5" />
                            <path d="M5 10v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
                            <path d="M9 14h6" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-semibold text-heading">
                            Shop Login
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-secondary-text">
                            Access the shop owner and staff portal for daily
                            store activity, operations, and workflow management.
                          </p>

                          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                            Go to Shop Login
                            <span className="transition-transform duration-300 group-hover:translate-x-1">
                              →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>

                  <div className="mt-8 rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-center text-xs leading-6 text-muted-foreground sm:text-sm lg:text-left">
                    Use the correct portal to keep access clean and role-based.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}