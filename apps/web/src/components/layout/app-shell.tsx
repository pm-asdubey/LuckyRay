'use client';

import { useEffect } from 'react';
import { ToastContainer } from '@/components/ui/toast';
import { useAppStore } from '@/store/app-store';
import { getAllSettings } from '@luckyray/storage';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const setSettings = useAppStore(s => s.setSettings);

  useEffect(() => {
    getAllSettings().then(setSettings).catch(console.error);
  }, [setSettings]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      <ToastContainer />
    </div>
  );
}
