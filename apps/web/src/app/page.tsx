'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Star, Sparkles, Moon, Sun, ChevronRight } from 'lucide-react';
import { getAllProfiles } from '@luckyray/storage';
import type { Profile } from '@luckyray/shared';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/layout/nav';
import { AppShell } from '@/components/layout/app-shell';
import { BottomNav } from '@/components/layout/nav';
import { formatShortDate } from '@/lib/utils';

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProfiles()
      .then(setProfiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="min-h-screen flex flex-col">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-accent/3 blur-3xl" />
            <div className="absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-gold/3 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-6 max-w-lg">
            {/* Logo mark */}
            <div className="h-16 w-16 rounded-2xl bg-accent-subtle border border-accent-muted flex items-center justify-center shadow-glow">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-accent">
                <path
                  d="M16 2L19 12H29L21 18L24 28L16 22L8 28L11 18L3 12H13L16 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-semibold text-content tracking-tight">
                LuckyRay
              </h1>
              <p className="text-sm text-content-muted leading-relaxed max-w-sm">
                AI-powered Jyotish companion. Deterministic birth chart calculations
                combined with thoughtful, evidence-based guidance.
              </p>
            </div>

            {profiles.length === 0 ? (
              <Link href="/profiles/new">
                <Button variant="primary" size="lg">
                  Create your first profile
                  <ArrowRight size={16} />
                </Button>
              </Link>
            ) : (
              <Link href="/profiles">
                <Button variant="primary" size="lg">
                  View profiles
                  <ArrowRight size={16} />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Recent profiles section (if any) */}
        {!loading && profiles.length > 0 && (
          <div className="px-6 pb-24 md:pb-8 max-w-2xl mx-auto w-full">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
                Recent profiles
              </h2>
              <Link
                href="/profiles"
                className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.slice(0, 4).map(profile => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="px-6 pb-24 md:pb-12 max-w-3xl mx-auto w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FeatureCard
              icon={<Star size={20} />}
              title="Deterministic Charts"
              description="Accurate planetary positions using established astronomical calculations."
            />
            <FeatureCard
              icon={<Sparkles size={20} />}
              title="AI Insights"
              description="Evidence-based explanations grounded in your actual chart data."
            />
            <FeatureCard
              icon={<Moon size={20} />}
              title="Local First"
              description="Your profiles and conversations stay on your device. No account needed."
            />
          </div>
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />
      </div>
    </AppShell>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  return (
    <Link href={`/chart/${profile.id}`}>
      <Card className="p-3 hover:border-accent-muted transition-colors cursor-pointer group">
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-content truncate group-hover:text-accent transition-colors">
              {profile.name}
            </div>
            <div className="text-2xs text-content-muted">
              {formatShortDate(profile.birthDetails.date)} · {profile.birthDetails.place}
            </div>
          </div>
          <ChevronRight size={14} className="text-content-subtle group-hover:text-accent transition-colors flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}

function FeatureCard({
  icon, title, description,
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 space-y-3">
      <div className="text-accent">{icon}</div>
      <div>
        <h3 className="text-sm font-semibold text-content">{title}</h3>
        <p className="text-xs text-content-muted mt-1 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
