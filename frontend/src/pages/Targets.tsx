import { useState, useEffect, useCallback } from 'react';
import { formatINRCompact } from '@/lib/currency';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Target,
  Plus,
  TrendingUp,
  CheckCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { apiClient } from '@/lib/axios';
import FormDrawer, { FormField, ChipSelect, inputClass, selectClass, textareaClass } from '@/components/FormDrawer';
import MoreDetails from '@/components/MoreDetails';

interface TargetItem {
  id: string;
  title: string;
  owner?: string;
  department?: string;
  period?: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
}

const targetTypes = [
  { value: 'sales', label: 'Sales' },
  { value: 'lead', label: 'Lead' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'project', label: 'Project' },
  { value: 'task', label: 'Task' },
];

export default function Targets() {
  const [targets, setTargets] = useState<TargetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TargetItem | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [targetType, setTargetType] = useState('sales');
  const [targetValue, setTargetValue] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentValue, setCurrentValue] = useState('0');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('active');
  const [unit, setUnit] = useState('₹');
  const [period, setPeriod] = useState('');

  const fetchTargets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/targets', { params: { per_page: 50 } });
      setTargets(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch targets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  const now = new Date();
  const defaultPeriod = now.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  const resetForm = () => {
    setEditTarget(null);
    setTitle('');
    setOwner('');
    setTargetType('sales');
    setTargetValue('');
    setEndDate('');
    setCurrentValue('0');
    setDescription('');
    setStatus('active');
    setUnit('₹');
    setPeriod(defaultPeriod);
  };

  const openCreateDrawer = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const openEditDrawer = (t: TargetItem) => {
    setEditTarget(t);
    setTitle(t.title);
    setOwner(t.owner || '');
    setTargetType(t.department || 'sales');
    setTargetValue(String(t.target_value));
    setEndDate('');
    setCurrentValue(String(t.current_value));
    setDescription('');
    setStatus(t.status);
    setUnit(t.unit);
    setPeriod(t.period || '');
    setDrawerOpen(true);
  };

  const submitForm = async (): Promise<boolean> => {
    if (!title.trim()) { toast.error('Target Name is required'); return false; }

    try {
      setSubmitLoading(true);
      const payload = {
        title: title.trim(),
        owner: owner.trim() || undefined,
        department: targetType,
        period: period.trim() || undefined,
        target_value: parseFloat(targetValue) || 0,
        current_value: parseFloat(currentValue) || 0,
        unit,
        status,
      };

      if (editTarget) {
        await apiClient.put(`/targets/${editTarget.id}`, payload);
        toast.success('Target updated');
      } else {
        await apiClient.post('/targets', payload);
        toast.success('Target created');
      }
      return true;
    } catch (err) {
      toast.error('Failed to save target');
      return false;
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSave = async () => {
    const ok = await submitForm();
    if (ok) { setDrawerOpen(false); fetchTargets(); }
  };

  const handleSaveAndNew = async () => {
    const ok = await submitForm();
    if (ok) { resetForm(); fetchTargets(); toast.info('Form cleared — add another target'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this target?')) return;
    try {
      await apiClient.delete(`/targets/${id}`);
      toast.success('Target deleted');
      setDrawerOpen(false);
      fetchTargets();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const getProgress = (t: TargetItem) => {
    if (t.target_value <= 0) return 0;
    return Math.min(100, Math.round((t.current_value / t.target_value) * 100));
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 90) return 'bg-emerald-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const formatValue = (val: number, u: string) => {
    if (u === '₹') {
      return formatINRCompact(val);
    }
    if (u === '%') return `${val}%`;
    return `${val.toLocaleString('en-IN')}${u ? ` ${u}` : ''}`;
  };

  const activeTargets = targets.filter((t) => t.status === 'active');
  const achievedTargets = targets.filter((t) => t.status === 'achieved');
  const avgProgress = activeTargets.length > 0
    ? Math.round(activeTargets.reduce((s, t) => s + getProgress(t), 0) / activeTargets.length)
    : 0;
  const onTrack = activeTargets.filter((t) => getProgress(t) >= 60).length;

  const stats = [
    { label: 'Active Targets', value: String(activeTargets.length), icon: Target, color: 'bg-purple-100 dark:bg-purple-900/50', iconColor: 'text-purple-600 dark:text-purple-400' },
    { label: 'Avg Achievement', value: `${avgProgress}%`, icon: TrendingUp, color: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'On Track', value: String(onTrack), icon: CheckCircle, color: 'bg-blue-100 dark:bg-blue-900/50', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: 'Achieved', value: String(achievedTargets.length), icon: CheckCircle, color: 'bg-amber-100 dark:bg-amber-900/50', iconColor: 'text-amber-600 dark:text-amber-400' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Targets & KPIs</h1>
          <p className="text-sm text-gray-500 mt-1">Goals, OKRs and achievement tracking.</p>
        </div>
        <Button onClick={openCreateDrawer} className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl h-9 px-4">
          <Plus className="h-4 w-4 mr-2" /> New Target
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                  <p className="text-3xl font-bold mt-1 text-gray-900 dark:text-white">{s.value}</p>
                </div>
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', s.color)}>
                  <s.icon className={cn('h-5 w-5', s.iconColor)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Target Cards Grid */}
      {targets.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950">
          <CardContent className="p-16 text-center">
            <Target className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No targets yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "+ New Target" to set your first goal.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {targets.map((t) => {
            const pct = getProgress(t);
            return (
              <Card
                key={t.id}
                className="border-0 shadow-sm rounded-2xl bg-white dark:bg-gray-950 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => openEditDrawer(t)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.title}</h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {[t.owner, t.period].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span className={cn('text-sm font-bold ml-2', pct >= 90 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-rose-500')}>
                      {pct}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full font-semibold',
                      t.status === 'achieved' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : t.status === 'missed' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    )}>
                      {t.status === 'achieved' ? 'Achieved' : t.status === 'missed' ? 'Missed' : 'Active'}
                    </span>
                    <span className="text-gray-500 font-medium">
                      {formatValue(t.current_value, t.unit)} / {formatValue(t.target_value, t.unit)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all duration-500', getProgressColor(pct))} style={{ width: `${pct}%` }} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <FormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editTarget ? 'Edit Target' : 'Set New Target'}
        subtitle={editTarget ? `Modify ${editTarget.title}` : 'Define a goal for your team.'}
        onSave={handleSave}
        onSaveAndNew={editTarget ? undefined : handleSaveAndNew}
        loading={submitLoading}
        editMode={!!editTarget}
        entityId={editTarget?.id}
        module="targets"
      >
        {/* Visible Fields */}
        <FormField label="Target Name" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Q2 Revenue" className={inputClass} autoFocus />
        </FormField>

        <FormField label="Employee / Owner">
          <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Person or team" className={inputClass} />
        </FormField>

        <FormField label="Target Type">
          <ChipSelect options={targetTypes} value={targetType} onChange={setTargetType} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Target Value">
            <Input type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" className={inputClass} />
          </FormField>
          <FormField label="Unit">
            <select value={unit} onChange={(e) => setUnit(e.target.value)} className={selectClass}>
              <option value="₹">₹ (Rupees)</option>
              <option value="%">% (Percent)</option>
              <option value="pts">pts (Points)</option>
              <option value="x">x (Times)</option>
              <option value="units">units</option>
            </select>
          </FormField>
        </div>

        <FormField label="End Date">
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </FormField>

        {/* More Details */}
        <MoreDetails defaultOpen={!!editTarget}>
          <FormField label="Achieved Value">
            <Input type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="0" className={inputClass} />
          </FormField>

          <FormField label="Period">
            <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="May 2026" className={inputClass} />
          </FormField>

          <FormField label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this target..." rows={2} className={textareaClass} />
          </FormField>

          <FormField label="Status">
            <ChipSelect
              options={[
                { value: 'active', label: 'Active' },
                { value: 'achieved', label: 'Achieved' },
                { value: 'missed', label: 'Missed' },
                { value: 'paused', label: 'Paused' },
              ]}
              value={status}
              onChange={setStatus}
            />
          </FormField>
        </MoreDetails>

        {/* Delete */}
        {editTarget && (
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 mt-2">
            <Button type="button" variant="ghost" size="sm" className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" onClick={() => handleDelete(editTarget.id)}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Target
            </Button>
          </div>
        )}
      </FormDrawer>
    </div>
  );
}
