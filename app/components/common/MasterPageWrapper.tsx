"use client";

type MasterPageWrapperProps = {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export default function MasterPageWrapper({
  title,
  subtitle,
  children,
}: MasterPageWrapperProps) {
  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className="">{children}</div>

      </div>
    </main>
  );
}