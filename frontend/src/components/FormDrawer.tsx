import { useEffect, useCallback } from 'react';
import { X, Loader2, Save, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import EntityActivityLog from '@/components/EntityActivityLog';

interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  onSave: () => void;
  onSaveAndNew?: () => void;
  loading?: boolean;
  children: React.ReactNode;
  editMode?: boolean;
  entityId?: string;
  module?: string;
}

export default function FormDrawer({
  open,
  onClose,
  title,
  subtitle,
  onSave,
  onSaveAndNew,
  loading = false,
  children,
  editMode = false,
  entityId,
  module,
}: FormDrawerProps) {
  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) {
        e.preventDefault();
        onSave();
      }
    },
    [onClose, onSave, loading]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-950 shadow-2xl rounded-2xl flex flex-col overflow-hidden',
          'animate-in slide-in-from-bottom-8 fade-in duration-500'
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {subtitle && <p className="text-purple-100 text-xs mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={() => !loading && onClose()}
              className="text-white/70 hover:text-white transition-colors h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
          {children}

          {/* Activity Log in edit mode */}
          {editMode && entityId && module && (
            <EntityActivityLog entityId={entityId} module={module} />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-6 py-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => !loading && onClose()}
              disabled={loading}
              className="rounded-xl h-9 border-gray-200 dark:border-gray-800"
            >
              Cancel
            </Button>
            <div className="flex-1" />
            {onSaveAndNew && !editMode && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onSaveAndNew}
                disabled={loading}
                className="rounded-xl h-9 text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/30"
              >
                <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                Save & Add New
              </Button>
            )}
            <Button
              type="button"
              onClick={onSave}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-5 min-w-[90px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {editMode ? 'Save Changes' : 'Save'}
                </>
              )}
            </Button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-right">
            Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[9px] font-mono">Ctrl+Enter</kbd> to save · <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-800 rounded text-[9px] font-mono">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* Reusable field wrapper */
export function FormField({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

/* Reusable chip select */
export function ChipSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all',
            value === o.value
              ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-800'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* Common input class */
export const inputClass =
  'rounded-xl border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 h-9 text-sm w-full';

export const selectClass =
  'w-full text-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-3 h-9 focus:outline-none focus:ring-1 focus:ring-purple-500';

export const textareaClass =
  'w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent';
