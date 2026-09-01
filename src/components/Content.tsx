import type { ReactNode } from "react";

interface ContentProps {
  title: string;
  count?: number;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Content = ({ title, count, action, children, className }: ContentProps) => (
  <div
    className={`flex w-full flex-col rounded-[var(--radius)] bg-[var(--card)] p-3 sm:p-4 ${className ?? ""}`}
  >
    <div className="flex items-start justify-between">
      <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
        {title}
        {count !== undefined && ` (${count})`}
      </h2>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
    <div className="mt-1.5 sm:mt-3">{children}</div>
  </div>
);
