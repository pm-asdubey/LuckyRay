'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createProfile } from '@luckyray/storage';
import type { BirthDetails } from '@luckyray/shared';
import { BirthDetailsForm } from '@/components/profile/birth-details-form';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import { useTranslation } from '@/hooks/use-translation';

export default function NewProfilePage() {
  const router = useRouter();
  const { addToast, setActiveProfile } = useAppStore();
  const t = useTranslation();

  const handleSubmit = async (data: {
    name: string;
    gender?: 'Male' | 'Female' | 'Other';
    birthDetails: BirthDetails;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const profile = {
      id,
      name: data.name,
      gender: data.gender,
      birthDetails: data.birthDetails,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };

    await createProfile(profile);
    setActiveProfile(profile);
    addToast({ type: 'success', message: `Profile "${data.name}" created` });
    router.push(`/chart/${id}`);
  };

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <PageLayout>
          <PageHeader
            title={t.newProfile.title}
            description={t.newProfile.description}
            back={
              <Link href="/profiles">
                <Button variant="icon" size="sm" aria-label={t.newProfile.backToProfiles}>
                  <ArrowLeft size={16} />
                </Button>
              </Link>
            }
          />
          <PageContent className="max-w-2xl pb-28 md:pb-6">
            <BirthDetailsForm onSubmit={handleSubmit} submitLabel={t.form.createProfile} />
          </PageContent>
        </PageLayout>
        <BottomNav />
      </div>
    </AppShell>
  );
}
