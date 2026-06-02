import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useFeatureStore, type FeatureMatrix } from '@/store/featureStore';

const roleLabels: Record<string, string> = {
  hr: 'HR',
  employee: 'Employee',
};

export default function FeatureAccessSettings() {
  const { modules, configurableRoles, featureAccess, fetchFeatureAccess, updateFeatureAccess } = useFeatureStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Local editable copy of the matrix
  const [draft, setDraft] = useState<FeatureMatrix>({});
  const [previewRole, setPreviewRole] = useState<string>('employee');

  const load = useCallback(async () => {
    setLoading(true);
    await fetchFeatureAccess();
    setLoading(false);
  }, [fetchFeatureAccess]);

  useEffect(() => { load(); }, [load]);

  // Sync local draft whenever the store matrix changes
  useEffect(() => {
    setDraft(JSON.parse(JSON.stringify(featureAccess || {})));
  }, [featureAccess]);

  const toggle = (role: string, key: string) => {
    setDraft((prev) => ({
      ...prev,
      [role]: { ...(prev[role] || {}), [key]: !(prev[role]?.[key] ?? true) },
    }));
  };

  const isOn = (role: string, key: string) => draft[role]?.[key] ?? true;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateFeatureAccess(draft);
      toast.success('Feature access updated. Changes apply to HR & Employee logins.');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to save feature access');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft(JSON.parse(JSON.stringify(featureAccess || {})));
    toast.info('Reverted unsaved changes');
  };

  // Group modules by their group label
  const grouped = modules.reduce((acc: Record<string, typeof modules>, m) => {
    (acc[m.group] = acc[m.group] || []).push(m);
    return acc;
  }, {});

  if (loading) {
    return (
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
        <CardContent className="p-12 flex items-center justify-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading feature access...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
      <CardHeader className="p-6 pb-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 shrink-0">
            <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold">Feature Access Control</CardTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              Choose which modules are visible to your <strong>HR</strong> and <strong>Employee</strong> users.
              Admins always see everything.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 pt-0">
        {/* Info banner — clarifies that admins always see everything */}
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Changes apply to <strong>HR</strong> and <strong>Employee</strong> logins only. As an admin you always
            see every module, so your own sidebar won't change after saving. Ask an HR/Employee user to refresh,
            or use the live preview below.
          </span>
        </div>

        {/* Table */}
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_120px] gap-2 px-4 py-3 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Feature / Module</span>
            {configurableRoles.map((role) => (
              <span key={role} className="text-[11px] font-bold uppercase tracking-wider text-gray-400 text-center hidden sm:block">
                {roleLabels[role] || role}
              </span>
            ))}
            {/* mobile single header */}
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 text-right sm:hidden">Access</span>
          </div>

          {/* Rows grouped by section */}
          {Object.entries(grouped).map(([group, mods]) => (
            <div key={group}>
              <div className="px-4 py-2 bg-gray-50/40 dark:bg-gray-900/20 border-b border-gray-100 dark:border-gray-800">
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-500/80">{group}</span>
              </div>
              {mods.map((m) => (
                <div key={m.key}
                  className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_120px_120px] gap-2 items-center px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/50 dark:hover:bg-gray-900/30 transition-colors">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{m.label}</span>
                  <div className="flex items-center gap-6 sm:contents">
                    {configurableRoles.map((role) => (
                      <div key={role} className="flex sm:justify-center items-center gap-1.5">
                        <span className="text-[11px] text-gray-400 sm:hidden">{roleLabels[role] || role}</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn(role, m.key)}
                          onClick={() => toggle(role, m.key)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                            isOn(role, m.key) ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                              isOn(role, m.key) ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div className="mt-5 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-50/70 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-800">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Live preview</span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              {configurableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => setPreviewRole(role)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    previewRole === role
                      ? 'bg-white dark:bg-gray-950 text-purple-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {roleLabels[role] || role}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-400 mb-3">
              Modules a <strong>{roleLabels[previewRole] || previewRole}</strong> user will see in their sidebar:
            </p>
            <div className="flex flex-wrap gap-2">
              {modules.filter((m) => isOn(previewRole, m.key)).length === 0 ? (
                <span className="text-xs text-gray-400 italic">No modules enabled for this role.</span>
              ) : (
                modules
                  .filter((m) => isOn(previewRole, m.key))
                  .map((m) => (
                    <span key={m.key}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300 border border-purple-100 dark:border-purple-900/40">
                      {m.label}
                    </span>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-5">
          <Button variant="outline" onClick={handleReset} disabled={saving}
            className="rounded-xl h-9 gap-1.5 border-gray-200 dark:border-gray-800">
            <RotateCcw className="h-3.5 w-3.5" /> Revert
          </Button>
          <Button onClick={handleSave} disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-6">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
