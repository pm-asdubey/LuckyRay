'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Star, ArrowRight } from 'lucide-react';
import { getAllProfiles, deleteProfile } from '@luckyray/storage';
import type { Profile } from '@luckyray/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { Avatar } from '@/components/layout/nav';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { useAppStore } from '@/store/app-store';
import { formatShortDate } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const addToast = useAppStore(s => s.addToast);
  const setActiveProfile = useAppStore(s => s.setActiveProfile);
  const t = useTranslation();

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const data = await getAllProfiles();
      setProfiles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfiles(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProfile(deleteTarget.id);
      setProfiles(prev => prev.filter(p => p.id !== deleteTarget.id));
      addToast({ type: 'success', message: `Profile "${deleteTarget.name}" deleted` });
      setDeleteTarget(null);
    } catch {
      addToast({ type: 'error', message: 'Failed to delete profile' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout>
          <PageHeader
            title={t.profiles.title}
            description={t.profiles.description}
            actions={
              <Link href="/profiles/new">
                <Button variant="primary" size="sm">
                  <Plus size={14} />
                  {t.profiles.newProfile}
                </Button>
              </Link>
            }
          />
          <PageContent>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton h-36 rounded-xl" />
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <EmptyState
                icon={<Star size={40} />}
                title={t.profiles.noProfilesTitle}
                description={t.profiles.noProfilesDesc}
                action={{ label: t.profiles.createProfile, onClick: () => window.location.href = '/profiles/new' }}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles.map(profile => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onDelete={() => setDeleteTarget(profile)}
                    onSelect={() => setActiveProfile(profile)}
                  />
                ))}
                {/* Add new card */}
                <Link href="/profiles/new">
                  <div className="rounded-xl border border-dashed border-surface-border hover:border-accent-muted h-[144px] flex flex-col items-center justify-center gap-2 text-content-subtle hover:text-accent transition-all cursor-pointer group">
                    <Plus size={24} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-medium">{t.profiles.newProfile}</span>
                  </div>
                </Link>
              </div>
            )}
          </PageContent>
        </PageLayout>
        <BottomNav />
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t.profiles.deleteProfile}
        description={deleteTarget ? t.profiles.deleteConfirm(deleteTarget.name) : ''}
        size="sm"
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t.profiles.cancel}
          </Button>
          <Button variant="destructive" loading={deleting} onClick={handleDelete}>
            {t.profiles.deleteProfile}
          </Button>
        </div>
      </Dialog>
    </AppShell>
  );
}

function ProfileCard({
  profile,
  onDelete,
  onSelect,
}: {
  profile: Profile;
  onDelete: () => void;
  onSelect: () => void;
}) {
  const t = useTranslation();
  return (
    <Card className="group hover:border-accent-muted/50 transition-colors">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={profile.name} />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-content truncate">{profile.name}</div>
              {profile.birthDetails.place && (
                <div className="text-2xs text-content-muted truncate">{profile.birthDetails.place}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Link href={`/profiles/${profile.id}/edit`}>
              <Button variant="icon" size="sm" aria-label={t.common.edit}>
                <Edit2 size={13} />
              </Button>
            </Link>
            <Button variant="icon" size="sm" onClick={onDelete} aria-label={t.common.delete}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-2xs text-content-muted">
            <span className="font-medium text-content-subtle">{t.profiles.born}</span>
            <span>{formatShortDate(profile.birthDetails.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-2xs text-content-muted">
            <span className="font-medium text-content-subtle">{t.profiles.time}</span>
            <span>{profile.birthDetails.time}</span>
          </div>
        </div>
      </div>
      <div className="border-t border-surface-border">
        <Link
          href={`/chart/${profile.id}`}
          className="flex items-center justify-between px-4 py-2.5 text-xs text-content-muted hover:text-accent hover:bg-accent-subtle/50 transition-colors rounded-b-xl group/link"
          onClick={onSelect}
        >
          <span>{t.profiles.viewChart}</span>
          <ArrowRight size={13} className="group-hover/link:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </Card>
  );
}
