'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getProfile, updateProfile } from '@luckyray/storage';
import type { Profile, BirthDetails } from '@luckyray/shared';
import { BirthDetailsForm } from '@/components/profile/birth-details-form';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { Skeleton } from '@/components/ui/skeleton';

export default function EditProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const { addToast, setActiveProfile } = useAppStore();

  useEffect(() => {
    getProfile(params.id)
      .then(p => setProfile(p ?? undefined))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleSubmit = async (data: {
    name: string;
    gender?: 'Male' | 'Female' | 'Other';
    birthDetails: BirthDetails;
    notes?: string;
  }) => {
    if (!profile) return;

    const updated: Profile = {
      ...profile,
      name: data.name,
      gender: data.gender,
      birthDetails: data.birthDetails,
      notes: data.notes,
      updatedAt: new Date().toISOString(),
    };

    await updateProfile(updated);
    setActiveProfile(updated);
    addToast({ type: 'success', message: 'Profile updated' });
    router.push(`/chart/${profile.id}`);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent className="max-w-2xl space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton lines={6} />
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <PageLayout>
            <PageContent>
              <p className="text-content-muted">Profile not found.</p>
            </PageContent>
          </PageLayout>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout>
          <PageHeader
            title={`Edit — ${profile.name}`}
            description="Update birth details for this profile"
            back={
              <Link href={`/chart/${profile.id}`}>
                <Button variant="icon" size="sm" aria-label="Back">
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
          />
          <PageContent className="max-w-2xl pb-28 md:pb-6">
            <BirthDetailsForm
              defaultValues={{
                name: profile.name,
                gender: profile.gender,
                birthDetails: profile.birthDetails,
                notes: profile.notes,
              }}
              onSubmit={handleSubmit}
              submitLabel="Save changes"
            />
          </PageContent>
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}
