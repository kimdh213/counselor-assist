'use client';

interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-slate-200 bg-white">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {action && <div>{action}</div>}
    </header>
  );
}
