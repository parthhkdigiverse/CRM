import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoreDetailsProps {
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function MoreDetails({ children, defaultOpen = false }: MoreDetailsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full text-left group py-1 hover:opacity-80 transition-opacity"
      >
        <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
          More Details
        </span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-purple-500 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
        <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800 ml-1" />
      </button>

      <div
        className={cn(
          'grid transition-all duration-300 ease-in-out',
          open ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
