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
import { useTranslation } from '@/hooks/use-translation';
import type { Language } from '@/lib/i18n';
import {
  isGoogleDriveConfigured,
  connectGoogleDrive,
  disconnectGoogleDrive,
  getDriveConnectionState,
  syncToGoogleDrive,
  importFromGoogleDrive,
} from '@/lib/google-drive';

const AI_MODELS = [
  { value: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B (Recommended)' },
  { value: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (Faster)' },
  { value: 'mistralai/mixtral-8x7b-instruct-v0.1', label: 'Mixtral 8x7B' },
];

const CHART_STYLES = [
  { value: 'north-indian', label: 'North Indian' },
  { value: 'south-indian', label: 'South Indian' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Google Drive UI state
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [driveImporting, setDriveImporting] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  const { addToast, settings: storeSettings, updateSettings, language, setLanguage, driveConnected, driveLastSync, setDriveState } = useAppStore();
  const t = useTranslation();

  useEffect(() => {
    getAllSettings()
      .then(s => setSettings(s))
      .finally(() => setLoading(false));

    // Initialise Drive state from localStorage
    const state = getDriveConnectionState();
    setDriveState(state.connected, state.lastSync);
    setAutoSync(typeof window !== 'undefined' && localStorage.getItem('lr_gdrive_autosync') === 'true');
  }, [setDriveState]);

  const handleSave = async (partial: Partial<AppSettings>) => {
    if (!settings) return;
    const updated = { ...settings, ...partial };
    setSaving(true);
    try {
      await Promise.all(
        (Object.keys(partial) as (keyof AppSettings)[]).map(k =>
          setSetting(k, (updated as AppSettings)[k] as AppSettings[typeof k]),
        ),
      );
      setSettings(updated);
      updateSettings(partial);
      addToast({ type: 'success', message: t.settings.saved });
    } catch {
      addToast({ type: 'error', message: t.settings.saveFailed });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllData();
      addToast({ type: 'success', message: t.settings.dataDeleted });
      setShowDeleteDialog(false);
      window.location.reload();
    } catch {
      addToast({ type: 'error', message: t.settings.deleteFailed });
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
          <PageHeader title={t.settings.title} description={t.settings.description} />
          <PageContent className="max-w-xl space-y-4 pb-24 md:pb-6">

            {/* Language */}
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.language}</CardTitle>
                <CardDescription>{t.settings.languageDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex rounded-lg border border-surface-border overflow-hidden w-fit">
                  {LANGUAGE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLanguage(opt.value)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        language === opt.value
                          ? 'bg-accent text-white'
                          : 'text-content-muted hover:text-content hover:bg-surface-elevated'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.aiModel}</CardTitle>
                <CardDescription>
                  {t.settings.aiModelDesc(<code className="text-accent">NVIDIA_API_KEY</code> as unknown as string)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label={t.settings.model}
                  value={settings.aiModel}
                  onChange={e => handleSave({ aiModel: e.target.value })}
                  options={AI_MODELS}
                  disabled={saving}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-muted">{t.settings.provider}</span>
                  <Badge variant="default">NVIDIA NIM</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Chart Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.chartDisplay}</CardTitle>
                <CardDescription>{t.settings.chartDisplayDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  label={t.settings.chartStyle}
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
                <CardTitle>{t.settings.appearance}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ToggleRow
                  label={t.settings.animations}
                  description={t.settings.animationsDesc}
                  checked={settings.animationsEnabled}
                  onChange={v => handleSave({ animationsEnabled: v })}
                  disabled={saving}
                />
                <ToggleRow
                  label={t.settings.debugMode}
                  description={t.settings.debugModeDesc}
                  checked={settings.debugMode}
                  onChange={v => handleSave({ debugMode: v })}
                  disabled={saving}
                />
              </CardContent>
            </Card>

            {/* Google Drive Sync */}
            <Card>
              <CardHeader>
                <CardTitle>{t.googleDrive.title}</CardTitle>
                <CardDescription>{t.googleDrive.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {!isGoogleDriveConfigured() ? (
                  <div className="space-y-2">
                    <p className="text-xs text-content-muted font-mono bg-surface-elevated rounded-lg px-3 py-2 border border-surface-border">
                      {t.googleDrive.notConfigured}
                    </p>
                    <p className="text-xs text-content-subtle">
                      {t.googleDrive.setupInstructions}:{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent underline underline-offset-2"
                      >
                        Google Cloud Console
                      </a>
                    </p>
                  </div>
                ) : !driveConnected ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={driveConnecting}
                    onClick={async () => {
                      setDriveConnecting(true);
                      try {
                        await connectGoogleDrive();
                        const state = getDriveConnectionState();
                        setDriveState(state.connected, state.lastSync);
                        addToast({ type: 'success', message: t.googleDrive.connected });
                      } catch (err) {
                        addToast({ type: 'error', message: err instanceof Error ? err.message : t.googleDrive.syncFailed });
                      } finally {
                        setDriveConnecting(false);
                      }
                    }}
                  >
                    {t.googleDrive.connect}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {/* Status row */}
                    <div className="flex items-center gap-2">
                      <Badge variant="default">{t.googleDrive.connected}</Badge>
                      <span className="text-xs text-content-muted">
                        {driveLastSync === 'never' || !driveLastSync
                          ? t.googleDrive.neverSynced
                          : t.googleDrive.lastSync(
                              driveLastSync === 'never'
                                ? t.googleDrive.neverSynced
                                : new Date(driveLastSync).toLocaleString(),
                            )}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={driveSyncing}
                        onClick={async () => {
                          setDriveSyncing(true);
                          try {
                            await syncToGoogleDrive();
                            const state = getDriveConnectionState();
                            setDriveState(state.connected, state.lastSync);
                            addToast({ type: 'success', message: t.googleDrive.syncSuccess });
                          } catch (err) {
                            addToast({ type: 'error', message: err instanceof Error ? err.message : t.googleDrive.syncFailed });
                          } finally {
                            setDriveSyncing(false);
                          }
                        }}
                      >
                        {driveSyncing ? t.googleDrive.syncing : t.googleDrive.syncNow}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        loading={driveImporting}
                        onClick={async () => {
                          setDriveImporting(true);
                          try {
                            const result = await importFromGoogleDrive();
                            addToast({ type: 'success', message: t.googleDrive.importSuccess(result.profiles) });
                            window.location.reload();
                          } catch (err) {
                            addToast({ type: 'error', message: err instanceof Error ? err.message : t.googleDrive.importFailed });
                          } finally {
                            setDriveImporting(false);
                          }
                        }}
                      >
                        {driveImporting ? t.googleDrive.importing : t.googleDrive.importFromDrive}
                      </Button>
                    </div>

                    {/* Auto-sync toggle */}
                    <ToggleRow
                      label={t.googleDrive.autoSync}
                      description={t.googleDrive.autoSyncDesc}
                      checked={autoSync}
                      onChange={v => {
                        setAutoSync(v);
                        localStorage.setItem('lr_gdrive_autosync', String(v));
                      }}
                    />

                    {/* Disconnect */}
                    <button
                      className="text-xs text-content-subtle hover:text-error underline underline-offset-2 transition-colors"
                      onClick={() => {
                        disconnectGoogleDrive();
                        setDriveState(false, null);
                        setAutoSync(false);
                        localStorage.removeItem('lr_gdrive_autosync');
                      }}
                    >
                      {t.googleDrive.disconnect}
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data management */}
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.dataManagement}</CardTitle>
                <CardDescription>{t.settings.dataManagementDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-content">{t.settings.exportAllData}</div>
                    <div className="text-xs text-content-muted">{t.settings.exportDesc}</div>
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
                      addToast({ type: 'success', message: t.settings.dataExported });
                    }}
                  >
                    {t.settings.export}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-content">{t.settings.importData}</div>
                    <div className="text-xs text-content-muted">{t.settings.importDesc}</div>
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
                    {t.settings.import}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-error">{t.settings.deleteAllData}</div>
                    <div className="text-xs text-content-muted">{t.settings.deleteAllDesc}</div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    {t.settings.deleteAll}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>{t.settings.aboutTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label={t.settings.engineVersion} value="1.0.0" />
                <InfoRow label={t.settings.ayanamsa} value="Lahiri (Chitrapaksha)" />
                <InfoRow label={t.settings.houseSystem} value="Whole Sign (Parashari)" />
                <InfoRow label={t.settings.dashaSystem} value="Vimshottari (120-year cycle)" />
                <InfoRow label={t.settings.ephemeris} value="astronomy-engine (VSOP87)" />
                <InfoRow label={t.settings.storage} value="IndexedDB (local-first)" />
              </CardContent>
            </Card>
          </PageContent>
        </PageLayout>
        <BottomNav />
      </div>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t.settings.deleteDialogTitle}
      >
        <div className="space-y-4">
          <p className="text-sm text-content-muted">{t.settings.deleteDialogDesc}</p>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowDeleteDialog(false)}>{t.settings.cancel}</Button>
            <Button variant="destructive" onClick={handleDeleteAll}>{t.settings.deleteEverything}</Button>
          </div>
        </div>
      </Dialog>
    </AppShell>
  );
}

function ToggleRow({
  label, description, checked, onChange, disabled,
}: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
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
