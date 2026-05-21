import { useState, useEffect, useCallback } from 'react';
import { History, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/axios';

interface EntityActivityLogProps {
  entityId: string;
  module: string;
}

const actionColors: Record<string, string> = {
  create: 'bg-emerald-500',
  update: 'bg-blue-500',
  delete: 'bg-rose-500',
  bulk_update: 'bg-indigo-500',
};

const actionLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  bulk_update: 'Bulk Updated',
};

export default function EntityActivityLog({ entityId, module }: EntityActivityLogProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/audit-logs', {
        params: {
          entity_id: entityId,
          module,
          per_page: 20,
          sort_by: 'created_at',
          sort_order: 'desc',
        },
      });
      setLogs(res.data.data || []);
      setFetched(true);
    } catch (err) {
      console.warn('Failed to fetch entity logs:', err);
    } finally {
      setLoading(false);
    }
  }, [entityId, module]);

  // Only fetch when expanded for the first time
  useEffect(() => {
    if (expanded && !fetched && entityId) fetchLogs();
  }, [expanded, fetched, entityId, fetchLogs]);

  const formatTime = (dateStr: string) => {
    return dateStr || '—';
  };

  const renderChangeDetail = (changes: Record<string, any>) => {
    if (!changes || Object.keys(changes).length === 0) return null;
    
    const filtered = Object.entries(changes).filter(
      ([key]) => !['updated_at', 'updated_by', 'created_at', 'created_by', 'is_deleted', 'deleted_at', 'deleted_by'].includes(key)
    );
    
    if (filtered.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {filtered.map(([key, value]) => {
          let displayVal = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value);
          if (displayVal.length > 35) displayVal = displayVal.substring(0, 32) + '...';
          return (
            <span
              key={key}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-100 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300"
            >
              {key}: {displayVal}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="border-t border-gray-100 dark:border-gray-800/50 mt-4 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left group py-1 px-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <History className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
            Activity Log
          </span>
          {fetched && (
            <span className="text-[10px] font-semibold text-white bg-purple-500 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
              {logs.length}
            </span>
          )}
        </div>
        <div className="h-6 w-6 rounded-md bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors">
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 max-h-52 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-gray-400 gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Loading activity...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-xs text-gray-400">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="relative pl-4">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-800" />

              {logs.map((log, idx) => (
                <div key={log.id || idx} className="relative flex gap-3 pb-3 last:pb-0">
                  {/* Timeline dot */}
                  <div className={`absolute left-[-9px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-gray-950 ${actionColors[log.action] || 'bg-gray-400'}`} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                        {log.user_name || 'System'}
                      </span>
                      <span className="text-[10px] font-medium text-gray-400">
                        {actionLabels[log.action] || log.action}
                      </span>
                      <span className="ml-auto text-[10px] text-gray-400 whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    {renderChangeDetail(log.changes)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
