'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAllProfiles } from '@luckyray/storage';

export default function ReportsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    getAllProfiles().then(profiles => {
      if (profiles.length > 0) {
        router.replace(`/reports/${profiles[0]!.id}`);
      } else {
        router.replace('/profiles');
      }
    });
  }, [router]);

  return null;
}
