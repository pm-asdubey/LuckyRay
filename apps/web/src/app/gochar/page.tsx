'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app-store';
import { getAllProfiles } from '@luckyray/storage';

export default function GocharRoot() {
  const router = useRouter();
  const activeProfile = useAppStore(s => s.activeProfile);

  useEffect(() => {
    if (activeProfile) {
      router.replace(`/gochar/${activeProfile.id}`);
    } else {
      getAllProfiles().then(profiles => {
        if (profiles.length > 0) {
          router.replace(`/gochar/${profiles[0]!.id}`);
        } else {
          router.replace('/profiles/new');
        }
      });
    }
  }, [activeProfile, router]);

  return null;
}
