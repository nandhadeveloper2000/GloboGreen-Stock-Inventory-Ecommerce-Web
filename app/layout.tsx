import "./globals.css";
import { AuthProvider } from "@/context/auth/AuthProvider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <AuthProvider>
          {children}

          <Toaster
            position="top-right"
            richColors
            closeButton
            offset={{ top: 72, right: 16, left: 16, bottom: 16 }}
            mobileOffset={{ top: 72, right: 12, left: 12, bottom: 12 }}
            containerAriaLabel="Notifications"
            toastOptions={{
              duration: 5000,
              className:
                "!z-[100] !max-w-[min(24rem,calc(100vw-1.5rem))] !whitespace-normal !break-words",
              classNames: {
                toast:
                  "!rounded-2xl !border !border-white/60 !bg-white/95 !text-slate-900 !shadow-[0_20px_60px_rgba(15,23,42,0.12)] !backdrop-blur-xl",
                title: "!text-sm !font-semibold !text-slate-900",
                description:
                  "!text-xs !text-slate-600 !whitespace-normal !break-words",
                actionButton:
                  "!bg-primary !text-white !rounded-xl",
                cancelButton:
                  "!bg-slate-100 !text-slate-700 !rounded-xl",
                success:
                  "!border-emerald-100",
                error:
                  "!border-rose-100",
                warning:
                  "!border-amber-100",
                info:
                  "!border-indigo-100",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
