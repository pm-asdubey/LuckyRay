'use client';

import { useState, useEffect } from 'react';
import { getAllSettings, setSetting, deleteAllData } from '@luckyray/storage';
import type { AppSettings } from '@luckyray/shared';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Dialog } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/store/app-store';
import { Skeleton } from '@/components/ui/skeleton';

const AI_MODELS = [
  { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Recommended)' },
  { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Faster)' },
  { value: 'mistralai/mixtral-8x7b-instruct-v0.1', label: 'Mixtral 8x7B' },
];

const CHART_STYLES = [
  { value: 'north-indian', label: 'North Indian' },
  { value: 'south-indian', label: 'South Indian' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { addToast, settings: storeSettings, updateSettings } = useAppStore();

  useEffect(() => {
    getAllSettings()
      .then(s => setSettings(s))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (partial: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    setSaving(true);
    try {
      // Persist each changed key individually
      await Promise.all(
        (Object.keys(partial) as (keyof AppSettings)[]).map(k =>
          setSetting(k, (updated as AppSettings)[k] as AppSettings[typeof k]),
        ),
      );
      setSettings(updated);
      updateSettings(partial);
      addToast({ type: 'success', message: 'Settings saved' });
    } catch {
      addToast({ type: 'error', message: 'Failed to save settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllData();
      addToast({ type: 'success', message: 'All data deleted' });
      setShowDeleteDialog(false);
      window.location.reload();
    } catch {
      addToast({ type: 'error', message: 'Failed to delete data' });
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent className="max-w-xl space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton lines={4} />
              <Skeleton lines={4} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  if (!settings) return null;

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout>
          <PageHeader title="Settings" description="Configure your LuckyRay experience" />
          <PageContent className="max-w-xl space-y-4 pb-24 md:pb-6">

            {/* AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>AI Model</CardTitle>
                <CardDescription>
                  NVIDIA NIM powers all AI interpretations. Requires <code className="text-accent">NVIDIA_API_KEY</code> environment variable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Model"
                  value={settings.aiModel}
                  onChange={e => handleSave({ aiModel: e.target.value })}
                  options={AI_MODELS}
                  disabled={saving}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-muted">Provider</span>
                  <Badge variant="default">NVIDIA NIM</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Chart Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Chart display</CardTitle>
                <CardDescription>
                  How birth charts are rendered.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  label="Chart style"
                  value={settings.chartStyle}
                  onChange={e => handleSave({ chartStyle: e.target.value as AppSettings['chartStyle'] })}
                  options={CHART_STYLES}
                  disabled={saving}
                />
              </CardContent>
            </Card>

            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow
                  label="Animations"
                  description="Subtle transitions and loading animations"
                  checked={settings.animationsEnabled}
                  onChange={v => handleSave({ animationsEnabled: v })}
                  disabled={saving}
                />
                <ToggleRow
                  label="Debug mode"
                  description="Show calculation details and engine metadata"
                  checked={settings.debugMode}
                  onChange={v => handleSave({ debugMode: v })}
                  disabled={saving}
                />
              </CardContent>
            </Card>

            {/* Data management */}
            <Card>
              <CardHeader>
                <CardTitle>Data management</CardTitle>
                <CardDescription>
                  All data is stored locally in your browser. Nothing is sent to external servers except AI queries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-content">Export all data</div>
                    <div className="text-xs text-content-muted">Download a complete JSON backup</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const { exportAllData } = await import('@luckyray/storage');
                      const jsonStr = await exportAllData();
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `luckyray-backup-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      addToast({ type: 'success', message: 'Data exported' });
                    }}
                  >
                    Export
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-content">Import data</div>
                    <div className="text-xs text-content-muted">Restore from a JSON backup file</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json,application/json';
                      input.onchange = async () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        const text = await file.text();
                        const { importData } = await import('@luckyray/storage');
                        const result = await importData(text);
                        if (result.success) {
                          addToast({ type: 'success', message: `Imported ${result.imported.profiles} profiles, ${result.imported.charts} charts` });
                          window.location.reload();
                        } else {
                          addToast({ type: 'error', message: result.error ?? 'Import failed' });
                        }
                      };
                      input.click();
                    }}
                  >
                    Import
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-error">Delete all data</div>
                    <div className="text-xs text-content-muted">Permanently remove all profiles, charts, and conversations</div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    Delete all
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About LuckyRay</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="Engine version" value="1.0.0" />
                <InfoRow label="Ayanamsa" value="Lahiri (Chitrapaksha)" />
                <InfoRow label="House system" value="Whole Sign (Parashari)" />
                <InfoRow label="Dasha system" value="Vimshottari (120-year cycle)" />
                <InfoRow label="Ephemeris" value="astronomy-engine (VSOP87)" />
                <InfoRow label="Storage" value="IndexedDB (local-first)" />
              </CardContent>
            </Card>
          </PageContent>
        </PageLayout>
        <BottomNav />
      </div>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title="Delete all data?"
      >
        <div className="space-y-4">
          <p className="text-sm text-content-muted">
            This will permanently delete all profiles, birth charts, conversations, and settings.
            This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>Delete everything</Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-content">{label}</div>
        <div className="text-xs text-content-muted">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={`relative h-5 w-9 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
          checked ? 'bg-accent' : 'bg-surface-overlay'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-content-muted">{label}</span>
      <span className="text-xs font-medium text-content">{value}</span>
    </div>
  );
}
