import * as React from "react";
import { cn } from "@/lib/utils";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  onValueChange?: (value: string) => void;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, onValueChange, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/10 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={(e) => {
        onValueChange?.(e.target.value);
        props.onChange?.(e);
      }}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";

const SelectTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectValue = ({ placeholder }: { placeholder?: string }) => (placeholder ? <option value="">{placeholder}</option> : null);
const SelectContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => <option value={value}>{children}</option>;

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
