'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronRight, Mic, MicOff, Check, Clock, RefreshCw,
  ArrowLeft, Plus, CalendarDays, Hand, Camera, Brain,
} from 'lucide-react';
import { getProfile } from '@luckyray/storage';
import type { Profile } from '@luckyray/shared';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { PageLayout, PageHeader, PageContent } from '@/components/layout/page-layout';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/app-store';
import {
  VOICE_READING_PASSAGE,
  VOICE_READING_INSTRUCTIONS,
  SIGN_PHYSICAL_PROFILES,
  PLANET_THEMES,
  computeConvergence,
  applySignLikelihoodUpdate,
  getAgeFilteredEvents,
  groupEventsByDomain,
  DOMAIN_LABELS,
  getNextSubjectiveQuestion,
  serializeSubjectiveQuestionForAI,
} from '@luckyray/birth-correction';
import type {
  CandidateBirthTime,
  GeneratedQuestion,
  KPEvent,
  KPDomain,
  SubjectiveQuestion,
} from '@luckyray/birth-correction';

// ─── Shared Types ─────────────────────────────────────────────────────────────

interface QuestionHistoryEntry {
  questionId: string;
  questionText: string;
  answerText: string;
  reasoning?: string;
}

// ─── Helper: Build a discrimination question from sub-lord groups ──────────────

function buildEventQuestion(
  selectedEventLabels: string[],
  eventDate: string,
  candidates: CandidateBirthTime[],
): GeneratedQuestion | null {
  const active = candidates.filter(c => c.probability >= 0.01);
  const groups = new Map<string, string[]>();
  for (const c of active) {
    const key = c.ascendantSubLord || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c.time);
  }
  if (groups.size < 2) return null;

  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const year = parseInt(eventDate.slice(0, 4), 10) || new Date().getFullYear();
  const month = parseInt(eventDate.slice(5, 7), 10);
  const periodLabel = month ? `${month}/${year}` : String(year);

  const questionGroups = sorted.map(([subLord, times]) => ({
    planets: [subLord] as import('@luckyray/shared').PlanetId[],
    themeLabel: PLANET_THEMES[subLord as import('@luckyray/shared').PlanetId]?.generalVibe ?? subLord,
    candidateCount: times.length,
    candidateTimes: times,
  }));

  const eventSummary = selectedEventLabels.slice(0, 2).join('; ');

  return {
    id: `event-${Date.now()}`,
    yearStart: year,
    yearEnd: year,
    groups: questionGroups,
    questionText: `Around ${periodLabel} you indicated: ${eventSummary}\n\nWhich planetary energy best describes the overall tone of that period?\n\n${sorted.slice(0, 4).map(([subLord], i) => `${String.fromCharCode(65 + i)}) ${subLord} — ${PLANET_THEMES[subLord as keyof typeof PLANET_THEMES]?.generalVibe ?? subLord}`).join('\n')}`,
    hint: 'Describe in your own words the feeling, mood, and main themes of that time.',
  };
}

function buildSubjectiveQuestion(
  sq: SubjectiveQuestion,
  candidates: CandidateBirthTime[],
): GeneratedQuestion {
  const active = candidates.filter(c => c.probability >= 0.01);
  const groups = new Map<string, string[]>();
  for (const c of active) {
    const key = c.ascendantSubLord || 'Unknown';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c.time);
  }
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const questionGroups = sorted.slice(0, 4).map(([subLord, times]) => ({
    planets: [subLord] as import('@luckyray/shared').PlanetId[],
    themeLabel: PLANET_THEMES[subLord as import('@luckyray/shared').PlanetId]?.generalVibe ?? subLord,
    candidateCount: times.length,
    candidateTimes: times,
  }));

  return {
    id: sq.id,
    yearStart: new Date().getFullYear(),
    yearEnd: new Date().getFullYear(),
    groups: questionGroups,
    questionText: sq.questionText,
    hint: sq.hint,
  };
}

// ─── AI Thinking Card ─────────────────────────────────────────────────────────

function AIThinkingCard({ label }: { label: string }) {
  return (
    <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-4 flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 mt-0.5">
        <Brain className="w-4 h-4 text-amber-400 animate-pulse" />
      </div>
      <div>
        <div className="text-sm text-amber-300/80 font-medium">{label}</div>
        <div className="flex items-center gap-1 mt-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-amber-400/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`
            flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all
            ${i < current ? 'bg-amber-500/30 text-amber-400' : i === current ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/30'}
          `}>
            {i < current ? <Check className="w-3 h-3" /> : i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-8 h-px mx-1 transition-all ${i < current ? 'bg-amber-500/40' : 'bg-white/10'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Probability Bar ──────────────────────────────────────────────────────────

function ProbabilityBar({ candidates }: { candidates: CandidateBirthTime[] }) {
  const top5 = [...candidates].sort((a, b) => b.probability - a.probability).slice(0, 5);
  const topProb = top5[0]?.probability ?? 0;
  const convergence = computeConvergence(candidates);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>Birth time probability</span>
        <span>{convergence.effectiveWindowMinutes}min window · {(convergence.topProbability * 100).toFixed(0)}% confidence</span>
      </div>
      {top5.map((c, i) => (
        <div key={c.time} className="flex items-center gap-3">
          <span className="text-xs text-white/50 w-12 shrink-0">{c.time}</span>
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${i === 0 ? 'bg-amber-400' : 'bg-white/20'}`}
              style={{ width: `${(c.probability / (topProb || 1)) * 100}%` }}
            />
          </div>
          <span className="text-xs text-white/40 w-12 text-right shrink-0">
            {(c.probability * 100).toFixed(1)}%
          </span>
          <span className="text-xs text-white/30 w-16 shrink-0">{c.ascendantSign}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Seed ─────────────────────────────────────────────────────────────

function SeedStep({
  profile,
  onComplete,
}: {
  profile: Profile;
  onComplete: (window: { centerTime: string | null; windowMinutes: number }) => void;
}) {
  const [timeKnowledge, setTimeKnowledge] = useState<'precise' | 'rough' | 'unknown'>('rough');
  const [centerTime, setCenterTime] = useState('');
  const [roughPeriod, setRoughPeriod] = useState('');
  const [loading, setLoading] = useState(false);

  const roughPeriods = [
    { label: 'Early morning (midnight–6am)', center: '03:00', window: 180 },
    { label: 'Morning (6am–noon)', center: '09:00', window: 180 },
    { label: 'Afternoon (noon–6pm)', center: '15:00', window: 180 },
    { label: 'Evening (6pm–midnight)', center: '21:00', window: 180 },
  ];

  const handleContinue = async () => {
    setLoading(true);
    if (timeKnowledge === 'precise' && centerTime) {
      onComplete({ centerTime, windowMinutes: 45 });
    } else if (timeKnowledge === 'rough' && roughPeriod) {
      const period = roughPeriods.find(p => p.label === roughPeriod);
      onComplete({ centerTime: period?.center ?? null, windowMinutes: period?.window ?? 180 });
    } else {
      onComplete({ centerTime: null, windowMinutes: 720 });
    }
    setLoading(false);
  };

  const canContinue =
    timeKnowledge === 'unknown' ||
    (timeKnowledge === 'precise' && centerTime) ||
    (timeKnowledge === 'rough' && roughPeriod);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-white mb-1">Starting point</h2>
        <p className="text-sm text-white/40">How well do you know {profile.name}'s birth time?</p>
      </div>

      <div className="space-y-2">
        {(['precise', 'rough', 'unknown'] as const).map(option => (
          <button
            key={option}
            onClick={() => setTimeKnowledge(option)}
            className={`w-full text-left p-4 rounded-xl border transition-all ${
              timeKnowledge === option
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-white/8 bg-white/2 hover:bg-white/5'
            }`}
          >
            <div className="font-medium text-sm text-white">
              {option === 'precise' ? 'I know it fairly precisely (±15 min)' :
               option === 'rough'   ? 'I have a rough idea — morning / afternoon' :
                                      'I have no idea'}
            </div>
            <div className="text-xs text-white/40 mt-0.5">
              {option === 'precise' ? 'Enter the time below' :
               option === 'rough'   ? 'Select a broad period' :
                                      "We'll work across the full 24 hours"}
            </div>
          </button>
        ))}
      </div>

      {timeKnowledge === 'precise' && (
        <div>
          <label className="text-xs text-white/50 block mb-2">Birth time (24-hour)</label>
          <input
            type="time"
            value={centerTime}
            onChange={e => setCenterTime(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-lg w-full focus:outline-none focus:border-amber-500/50"
          />
        </div>
      )}

      {timeKnowledge === 'rough' && (
        <div className="space-y-2">
          {roughPeriods.map(p => (
            <button
              key={p.label}
              onClick={() => setRoughPeriod(p.label)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                roughPeriod === p.label
                  ? 'border-amber-500/50 bg-amber-500/10 text-white'
                  : 'border-white/8 bg-white/2 text-white/60 hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <Button onClick={handleContinue} disabled={!canContinue || loading} className="w-full">
        {loading ? 'Computing candidates…' : 'Begin'}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// ─── Step 2: Photo, Palm & Voice ──────────────────────────────────────────────

function PhysicalStep({
  candidates,
  onComplete,
}: {
  candidates: CandidateBirthTime[];
  onComplete: (updatedCandidates: CandidateBirthTime[]) => void;
}) {
  const [facePhotoUrl, setFacePhotoUrl] = useState<string | null>(null);
  const [palmPhotoUrl, setPalmPhotoUrl] = useState<string | null>(null);
  const [additionalFeatures, setAdditionalFeatures] = useState('');
  const [voiceNotes, setVoiceNotes] = useState('');
  const [showVoicePassage, setShowVoicePassage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzePhase, setAnalyzePhase] = useState<'face' | 'palm' | 'voice' | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const faceInputRef = useRef<HTMLInputElement>(null);
  const palmInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addToast = useAppStore(s => s.addToast);

  const handlePhotoSelect = (setter: (url: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recorder.start();
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => {
          if (s >= 90) { stopRecording(); return s; }
          return s + 1;
        });
      }, 1000);
    } catch {
      addToast({ type: 'error', message: 'Microphone access denied' });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingComplete(true);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisResult(null);

    let analysisMode: 'face' | 'palm' | 'both' = 'face';
    if (facePhotoUrl && palmPhotoUrl) analysisMode = 'both';
    else if (palmPhotoUrl) analysisMode = 'palm';

    if (facePhotoUrl) setAnalyzePhase('face');
    else if (palmPhotoUrl) setAnalyzePhase('palm');
    else if (voiceNotes) setAnalyzePhase('voice');

    try {
      const res = await fetch('/api/birth-correction/analyze-physical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signProfiles: SIGN_PHYSICAL_PROFILES,
          userDescriptions: {
            height: '',
            build: '',
            complexion: '',
            faceNotes: additionalFeatures,
            voiceNotes,
            additionalFeatures,
          },
          hasPhoto: !!facePhotoUrl,
          photoBase64: facePhotoUrl ?? undefined,
          palmPhotoBase64: palmPhotoUrl ?? undefined,
          analysisMode,
        }),
      });

      const data = await res.json() as {
        signLikelihoods: Record<string, number>;
        eliminatedSigns: string[];
        reasoning: string;
        topSigns: string[];
      };

      setAnalysisResult(data.reasoning);
      const updated = applySignLikelihoodUpdate(candidates, data.signLikelihoods);
      setTimeout(() => onComplete(updated), 1800);
    } catch {
      addToast({ type: 'error', message: 'Analysis failed — skipping this step' });
      onComplete(candidates);
    } finally {
      setAnalyzing(false);
      setAnalyzePhase(null);
    }
  };

  const canAnalyze = facePhotoUrl || palmPhotoUrl || voiceNotes || additionalFeatures;

  const analyzeLabel =
    analyzePhase === 'face' ? 'Analyzing facial features and bearing…' :
    analyzePhase === 'palm' ? 'Reading the palm — identifying mounts and major lines…' :
    analyzePhase === 'voice' ? 'Analyzing voice characteristics…' :
    'Synthesizing physical evidence…';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-white mb-1">Photos & voice</h2>
        <p className="text-sm text-white/40">
          Your face, palm, and voice carry the signature of your rising sign.
          Photos are analyzed and never stored.
        </p>
      </div>

      {/* ── Face photo ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/50 font-medium uppercase tracking-wide">Face photo</span>
        </div>

        {facePhotoUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={facePhotoUrl} alt="Face photo"
              className="w-full max-h-56 object-cover rounded-xl border border-white/10" />
            <button
              onClick={() => { setFacePhotoUrl(null); if (faceInputRef.current) faceInputRef.current.value = ''; }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white/70 hover:text-white flex items-center justify-center text-sm"
            >×</button>
          </div>
        ) : (
          <button
            onClick={() => faceInputRef.current?.click()}
            className="w-full h-36 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-white/20 hover:text-white/50 transition-all group"
          >
            <Camera className="w-5 h-5" />
            <span className="text-sm">Take or upload a face photo</span>
            <span className="text-xs">Clear front-facing, natural light</span>
          </button>
        )}
        <input ref={faceInputRef} type="file" accept="image/*" capture="user" className="hidden"
          onChange={handlePhotoSelect(setFacePhotoUrl)} />
        <p className="text-xs text-white/25 leading-relaxed">
          The AI assesses facial structure, eye character, complexion, and bearing to score each rising sign.
        </p>
      </div>

      {/* ── Palm photo ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Hand className="w-3.5 h-3.5 text-white/40" />
          <span className="text-xs text-white/50 font-medium uppercase tracking-wide">Palm photo</span>
          <span className="text-xs text-amber-500/50 ml-1">— powerful for sub-lord identification</span>
        </div>

        {palmPhotoUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={palmPhotoUrl} alt="Palm photo"
              className="w-full max-h-56 object-cover rounded-xl border border-white/10" />
            <button
              onClick={() => { setPalmPhotoUrl(null); if (palmInputRef.current) palmInputRef.current.value = ''; }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 text-white/70 hover:text-white flex items-center justify-center text-sm"
            >×</button>
          </div>
        ) : (
          <button
            onClick={() => palmInputRef.current?.click()}
            className="w-full h-36 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-white/20 hover:text-white/50 transition-all group"
          >
            <Hand className="w-5 h-5" />
            <span className="text-sm">Photo of your dominant hand</span>
            <span className="text-xs">Palm facing up, fingers slightly spread</span>
          </button>
        )}
        <input ref={palmInputRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={handlePhotoSelect(setPalmPhotoUrl)} />
        <p className="text-xs text-white/25 leading-relaxed">
          The AI reads the dominant mount (Jupiter, Saturn, Venus, etc.) to identify which planetary energy
          shapes your Ascendant — this is a classical KP technique.
        </p>
      </div>

      {/* ── Additional appearance notes ── */}
      <div>
        <label className="text-xs text-white/50 block mb-1.5">Additional appearance notes (optional)</label>
        <textarea
          value={additionalFeatures}
          onChange={e => setAdditionalFeatures(e.target.value)}
          placeholder="e.g. very expressive eyes, often told I look younger than my age, prominent jawline, graceful hands…"
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
        />
      </div>

      {/* ── Voice recording ── */}
      <div className="border border-white/8 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Voice recording</div>
            <div className="text-xs text-white/40">How you speak reveals the planetary influence on your rising sign</div>
          </div>
          <button
            onClick={() => setShowVoicePassage(v => !v)}
            className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors"
          >
            {showVoicePassage ? 'Hide passage' : 'View passage'}
          </button>
        </div>

        {showVoicePassage && (
          <div className="bg-black/20 rounded-lg p-4 border border-white/5">
            <div className="text-xs text-white/30 mb-2 font-medium tracking-wide uppercase">Read this aloud — ~1 minute</div>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line font-light">
              {VOICE_READING_PASSAGE}
            </p>
            <div className="mt-3 space-y-1">
              {VOICE_READING_INSTRUCTIONS.map((inst, i) => (
                <div key={i} className="text-xs text-white/30 flex items-start gap-2">
                  <span className="text-amber-500/50 shrink-0">·</span>{inst}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          {!recordingComplete ? (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                isRecording
                  ? 'bg-red-500/20 border border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
              }`}
            >
              {isRecording
                ? <><MicOff className="w-4 h-4" /> Stop ({recordingSeconds}s)</>
                : <><Mic className="w-4 h-4" /> Record reading</>}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Check className="w-4 h-4" />
              {recordingSeconds}s captured
              <button
                onClick={() => { setRecordingComplete(false); setRecordingSeconds(0); }}
                className="text-white/30 hover:text-white/60 ml-2"
              ><RefreshCw className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1.5">Describe your voice style (optional)</label>
          <input
            value={voiceNotes}
            onChange={e => setVoiceNotes(e.target.value)}
            placeholder="e.g. soft and measured, naturally loud, fast talker, monotone, sing-song…"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* AI thinking indicator */}
      {analyzing && <AIThinkingCard label={analyzeLabel} />}

      {/* Analysis result */}
      {analysisResult && !analyzing && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-sm text-white/70 leading-relaxed">
          <div className="text-xs text-amber-500/60 font-medium mb-1 uppercase tracking-wide">AI interpretation</div>
          {analysisResult}
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={() => onComplete(candidates)} variant="ghost" className="text-white/40">
          Skip
        </Button>
        <Button onClick={handleAnalyze} disabled={!canAnalyze || analyzing} className="flex-1">
          {analyzing
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing…</>
            : <>Analyze & continue <ChevronRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    </div>
  );
}

// ─── KP Event Checklist ───────────────────────────────────────────────────────

function KPEventChecklist({
  eventDate,
  birthYear,
  selectedIds,
  eventDetails,
  onToggle,
  onDetailChange,
}: {
  eventDate: string;
  birthYear: number;
  selectedIds: string[];
  eventDetails: Record<string, string>;
  onToggle: (id: string) => void;
  onDetailChange: (id: string, text: string) => void;
}) {
  if (!eventDate) return null;
  const year = parseInt(eventDate.slice(0, 4), 10);
  if (!year) return null;

  const filtered = getAgeFilteredEvents(year, birthYear);
  const grouped = groupEventsByDomain(filtered);
  const age = year - birthYear;

  return (
    <div className="space-y-4">
      <div className="text-xs text-white/30 italic">
        During {year} ({profile_age_label(age)}) — select everything that happened:
      </div>
      {(Object.entries(grouped) as [KPDomain, KPEvent[]][]).map(([domain, events]) => (
        <div key={domain} className="space-y-1.5">
          <div className="text-xs text-white/40 font-medium uppercase tracking-wide">
            {DOMAIN_LABELS[domain]}
          </div>
          {events.map(ev => (
            <div key={ev.id}>
              <button
                type="button"
                onClick={() => onToggle(ev.id)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-all ${
                  selectedIds.includes(ev.id)
                    ? 'border-amber-500/40 bg-amber-500/8 text-white'
                    : 'border-white/6 bg-white/2 text-white/55 hover:bg-white/5 hover:text-white/70'
                }`}
              >
                <div className={`w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                  selectedIds.includes(ev.id) ? 'bg-amber-500 border-amber-500' : 'border-white/20'
                }`}>
                  {selectedIds.includes(ev.id) && <Check className="w-2.5 h-2.5 text-black" />}
                </div>
                <span className="text-sm leading-snug">{ev.label}</span>
              </button>

              {selectedIds.includes(ev.id) && ev.followUp && (
                <div className="ml-7 mt-1.5">
                  <input
                    type="text"
                    value={eventDetails[ev.id] ?? ''}
                    onChange={e => onDetailChange(ev.id, e.target.value)}
                    placeholder={ev.followUp}
                    className="w-full bg-white/3 border border-white/8 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-amber-500/30"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function profile_age_label(age: number): string {
  if (age < 1) return 'shortly after birth';
  if (age === 1) return '1 year old';
  return `${age} years old`;
}

// ─── Step 3: Interview ────────────────────────────────────────────────────────

const MAX_QUESTIONS = 20;
const SUBJECTIVE_INTERVAL = 3; // ask a subjective question every N period questions

function InterviewStep({
  candidates,
  birthYear,
  onUpdate,
  onComplete,
}: {
  candidates: CandidateBirthTime[];
  birthYear: number;
  onUpdate: (updated: CandidateBirthTime[]) => void;
  onComplete: () => void;
}) {
  const [currentQuestion, setCurrentQuestion] = useState<GeneratedQuestion | null>(null);
  const [currentSubjective, setCurrentSubjective] = useState<SubjectiveQuestion | null>(null);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [dashaQuestionsExhausted, setDashaQuestionsExhausted] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [scoring, setScoring] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState<GeneratedQuestion[]>([]);
  const [subjectiveAskedIds, setSubjectiveAskedIds] = useState<string[]>([]);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistoryEntry[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [periodQuestionsCount, setPeriodQuestionsCount] = useState(0);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [convergence, setConvergence] = useState(computeConvergence(candidates));
  const [scaleValue, setScaleValue] = useState<number | null>(null);

  // Event checklist state
  const [eventDate, setEventDate] = useState('');
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [eventDetails, setEventDetails] = useState<Record<string, string>>({});
  const [eventFreeText, setEventFreeText] = useState('');

  const addToast = useAppStore(s => s.addToast);
  const currentCandidatesRef = useRef(candidates);
  currentCandidatesRef.current = candidates;

  const shouldAskSubjective = useCallback((periodCount: number) => {
    return periodCount > 0 && periodCount % SUBJECTIVE_INTERVAL === 0;
  }, []);

  const loadNextDashaQuestion = useCallback(async (
    currentCandidates: CandidateBirthTime[],
    asked: GeneratedQuestion[],
    periodCount: number,
  ) => {
    // Alternate: every SUBJECTIVE_INTERVAL period questions, ask a subjective one
    if (shouldAskSubjective(periodCount)) {
      const sq = getNextSubjectiveQuestion(subjectiveAskedIds);
      if (sq) {
        setCurrentSubjective(sq);
        setCurrentQuestion(null);
        return;
      }
    }

    setQuestionLoading(true);
    try {
      const res = await fetch('/api/birth-correction/next-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: currentCandidates, questionsAlreadyAsked: asked, birthYear }),
      });
      const data = await res.json() as {
        question: GeneratedQuestion | null;
        convergence: { hasConverged: boolean; topProbability: number; effectiveWindowMinutes: number };
      };
      setCurrentQuestion(data.question);
      setConvergence(data.convergence);
      setCurrentSubjective(null);
      if (!data.question) setDashaQuestionsExhausted(true);
    } catch {
      setDashaQuestionsExhausted(true);
    } finally {
      setQuestionLoading(false);
    }
  }, [birthYear, shouldAskSubjective, subjectiveAskedIds]);

  useEffect(() => {
    loadNextDashaQuestion(candidates, [], 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitQuestion = async (
    question: GeneratedQuestion,
    freeText: string,
    opts: {
      isSubjective?: boolean;
      subjectiveContext?: string;
      sqId?: string;
      selectedEventIds?: string[];
      eventDetails?: Record<string, string>;
    } = {},
  ) => {
    if (!freeText.trim()) return;
    setScoring(true);

    try {
      const res = await fetch('/api/birth-correction/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer: { questionId: question.id, freeText },
          candidates: currentCandidatesRef.current,
          questionHistory,
          selectedEventIds: opts.selectedEventIds ?? [],
          eventDetails: opts.eventDetails ?? {},
          isSubjective: opts.isSubjective ?? false,
          subjectiveContext: opts.subjectiveContext ?? '',
        }),
      });

      const data = await res.json() as {
        result: { reasoning: string; confidence: number };
        updatedCandidates: CandidateBirthTime[];
      };

      const reasoning = data.result.reasoning;
      setLastReasoning(reasoning);
      onUpdate(data.updatedCandidates);

      // Store Q&A in history
      const historyEntry: QuestionHistoryEntry = {
        questionId: question.id,
        questionText: question.questionText.slice(0, 200),
        answerText: freeText.slice(0, 300),
        reasoning,
      };
      setQuestionHistory(prev => [...prev, historyEntry]);

      const newAsked = [...questionsAsked, question];
      setQuestionsAsked(newAsked);
      setQuestionsAnswered(q => q + 1);
      setAnswerText('');
      setScaleValue(null);
      setEventDate('');
      setSelectedEventIds([]);
      setEventDetails({});
      setEventFreeText('');
      setCurrentQuestion(null);
      setCurrentSubjective(null);

      if (opts.sqId) {
        setSubjectiveAskedIds(prev => [...prev, opts.sqId!]);
      }

      const newConvergence = computeConvergence(data.updatedCandidates);
      setConvergence(newConvergence);

      const newPeriodCount = opts.isSubjective ? periodQuestionsCount : periodQuestionsCount + 1;
      if (!opts.isSubjective) setPeriodQuestionsCount(newPeriodCount);

      // Keep asking until converged (85% confidence, ≤15 min window) or question limit reached
      const reachedLimit = questionsAnswered + 1 >= MAX_QUESTIONS;
      if (!newConvergence.hasConverged && !reachedLimit) {
        if (!dashaQuestionsExhausted) {
          await loadNextDashaQuestion(data.updatedCandidates, newAsked, newPeriodCount);
        } else {
          // Stay in event-entry mode; optionally queue a subjective question
          if (shouldAskSubjective(newPeriodCount)) {
            const sq = getNextSubjectiveQuestion(
              opts.sqId ? [...subjectiveAskedIds, opts.sqId] : subjectiveAskedIds,
            );
            if (sq) setCurrentSubjective(sq);
          }
        }
      }
    } catch {
      addToast({ type: 'error', message: 'Scoring failed — try again' });
    } finally {
      setScoring(false);
    }
  };

  const handleSubmitDashaAnswer = () => {
    if (!currentQuestion || !answerText.trim()) return;
    submitQuestion(currentQuestion, answerText);
  };

  const handleSubmitSubjective = () => {
    if (!currentSubjective) return;
    const hasScale = !!currentSubjective.scale;
    const hasText = !!answerText.trim();
    if (!hasScale && !hasText) return;
    if (hasScale && scaleValue === null && !hasText) return;

    const scalePart = (hasScale && scaleValue !== null)
      ? `Score: ${scaleValue}/5 (${currentSubjective.scale!.lowLabel} → ${currentSubjective.scale!.highLabel}).`
      : '';
    const fullAnswer = [scalePart, answerText.trim()].filter(Boolean).join(' ');

    const question = buildSubjectiveQuestion(currentSubjective, currentCandidatesRef.current);
    submitQuestion(question, fullAnswer, {
      isSubjective: true,
      subjectiveContext: serializeSubjectiveQuestionForAI(currentSubjective),
      sqId: currentSubjective.id,
    });
  };

  const handleSubmitEvent = () => {
    if (!eventDate || selectedEventIds.length === 0) return;
    const selectedEvents = getAgeFilteredEvents(parseInt(eventDate.slice(0, 4), 10), birthYear)
      .filter(e => selectedEventIds.includes(e.id));
    const q = buildEventQuestion(selectedEvents.map(e => e.label), eventDate, currentCandidatesRef.current);
    if (!q) {
      addToast({ type: 'info', message: 'All remaining candidates share the same sub-lord for this period. Try a different date.' });
      return;
    }
    const freeText = [
      ...selectedEvents.map(e => e.label),
      eventFreeText,
    ].filter(Boolean).join('. ');
    submitQuestion(q, freeText, { selectedEventIds, eventDetails });
  };

  const toggleEventId = (id: string) => {
    setSelectedEventIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const setEventDetail = (id: string, text: string) => {
    setEventDetails(prev => ({ ...prev, [id]: text }));
  };

  // ── Converged ──
  if (convergence.hasConverged) {
    return (
      <div className="space-y-6">
        <div>
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-xl font-light text-white mb-1">Birth time identified</h2>
          <p className="text-sm text-white/40">
            Converged to a {convergence.effectiveWindowMinutes}-minute window
            with {(convergence.topProbability * 100).toFixed(0)}% confidence after {questionsAnswered} questions.
          </p>
        </div>
        <ProbabilityBar candidates={candidates} />
        <Button onClick={onComplete} className="w-full">
          View results <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-light text-white mb-1">Evidence interview</h2>
        <p className="text-sm text-white/40">
          {dashaQuestionsExhausted
            ? 'Adding precise life events narrows the Ascendant sub-lord directly.'
            : 'Questions target the most informative split in remaining candidates. Answer freely.'}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-white/30">
        <span>{questionsAnswered} answered</span>
        <span>·</span>
        <span>{convergence.effectiveWindowMinutes}min window</span>
        <span>·</span>
        <span>{(convergence.topProbability * 100).toFixed(0)}% confidence</span>
        <span>·</span>
        <span>{candidates.filter(c => c.probability >= 0.01).length} candidates</span>
      </div>

      {lastReasoning && (
        <div className="bg-white/3 border border-white/6 rounded-lg px-4 py-3 text-sm text-white/50 italic leading-relaxed">
          <div className="text-xs text-white/30 font-medium mb-1 not-italic uppercase tracking-wide">AI reasoning</div>
          {lastReasoning}
        </div>
      )}

      {/* ── AI thinking during scoring ── */}
      {scoring && <AIThinkingCard label="Interpreting your answer and updating probabilities…" />}

      {/* ── Loading next dasha question ── */}
      {questionLoading && !scoring && (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="h-28 bg-white/5 rounded-xl" />
        </div>
      )}

      {/* ── Dasha-based question ── */}
      {!questionLoading && currentQuestion && !scoring && (
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-amber-500/60 font-medium mb-3 tracking-wide uppercase">
              {currentQuestion.yearStart === currentQuestion.yearEnd
                ? currentQuestion.yearStart
                : `${currentQuestion.yearStart} – ${currentQuestion.yearEnd}`}
            </div>
            <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
              {currentQuestion.questionText}
            </p>
            <p className="text-xs text-white/30 mt-3 italic">{currentQuestion.hint}</p>
          </div>

          <textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder="Describe what this period was like — specific events, feelings, or changes. The more detail, the more accurate the result."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 resize-none transition-colors"
          />

          <div className="flex gap-3">
            <Button
              onClick={() => {
                const newAsked = [...questionsAsked, currentQuestion];
                setQuestionsAsked(newAsked);
                setCurrentQuestion(null);
                loadNextDashaQuestion(currentCandidatesRef.current, newAsked, periodQuestionsCount);
              }}
              variant="ghost"
              className="text-white/30 hover:text-white/50"
            >
              Skip
            </Button>
            <Button onClick={handleSubmitDashaAnswer} disabled={!answerText.trim() || scoring} className="flex-1">
              Submit <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Subjective personality question ── */}
      {!questionLoading && currentSubjective && !scoring && (
        <div className="space-y-4">
          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <div className="text-xs text-amber-500/60 font-medium mb-3 tracking-wide uppercase">
              About you
            </div>
            <p className="text-sm text-white/80 leading-relaxed">
              {currentSubjective.questionText}
            </p>
            <p className="text-xs text-white/30 mt-3 italic">{currentSubjective.hint}</p>
          </div>

          {/* 1–5 scale for scale questions */}
          {currentSubjective.scale && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                {[1, 2, 3, 4, 5].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setScaleValue(val)}
                    className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${
                      scaleValue === val
                        ? 'border-amber-500/60 bg-amber-500/20 text-amber-300'
                        : 'border-white/10 bg-white/3 text-white/40 hover:bg-white/8 hover:text-white/60'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-white/25">
                <span>{currentSubjective.scale.lowLabel}</span>
                <span>{currentSubjective.scale.highLabel}</span>
              </div>
            </div>
          )}

          <textarea
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            placeholder={currentSubjective.scale
              ? 'Add any details or context that might help…'
              : 'Answer honestly — there is no right or wrong. Your natural tendencies matter more than aspirations.'}
            rows={currentSubjective.scale ? 2 : 3}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 resize-none transition-colors"
          />

          <div className="flex gap-3">
            <Button
              onClick={() => {
                setSubjectiveAskedIds(prev => [...prev, currentSubjective.id]);
                setScaleValue(null);
                setCurrentSubjective(null);
                if (!dashaQuestionsExhausted) {
                  loadNextDashaQuestion(currentCandidatesRef.current, questionsAsked, periodQuestionsCount);
                }
              }}
              variant="ghost"
              className="text-white/30 hover:text-white/50"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmitSubjective}
              disabled={(currentSubjective.scale ? scaleValue === null && !answerText.trim() : !answerText.trim()) || scoring}
              className="flex-1"
            >
              Submit <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Life event entry (always available; primary when dasha exhausted) ── */}
      {!scoring && (
        <div className={`border rounded-xl p-5 space-y-4 transition-all ${
          dashaQuestionsExhausted ? 'border-amber-500/20 bg-amber-500/3' : 'border-white/6 bg-white/2'
        }`}>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-400/60" />
            <span className="text-sm font-medium text-white">Add a life event</span>
            {dashaQuestionsExhausted && (
              <span className="text-xs text-amber-400/60 ml-auto">Primary refinement method</span>
            )}
          </div>
          <p className="text-xs text-white/30">
            Select a date and check all events that happened in that year.
            Precise dates unlock KP sub-lord matching — the most accurate rectification method.
          </p>

          <div>
            <label className="text-xs text-white/40 block mb-1.5">Date (as precise as possible)</label>
            <input
              type="date"
              value={eventDate}
              onChange={e => {
                setEventDate(e.target.value);
                setSelectedEventIds([]);
                setEventDetails({});
              }}
              max={new Date().toISOString().slice(0, 10)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
            />
          </div>

          {eventDate && (
            <KPEventChecklist
              eventDate={eventDate}
              birthYear={birthYear}
              selectedIds={selectedEventIds}
              eventDetails={eventDetails}
              onToggle={toggleEventId}
              onDetailChange={setEventDetail}
            />
          )}

          {selectedEventIds.length > 0 && (
            <div>
              <label className="text-xs text-white/40 block mb-1.5">
                Any additional context about this period? (optional)
              </label>
              <textarea
                value={eventFreeText}
                onChange={e => setEventFreeText(e.target.value)}
                placeholder="Overall feeling of the period, what changed, how it resolved…"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none"
              />
            </div>
          )}

          <Button
            onClick={handleSubmitEvent}
            disabled={!eventDate || selectedEventIds.length === 0 || scoring}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add events & refine
          </Button>
        </div>
      )}

      <ProbabilityBar candidates={candidates} />

      {questionsAnswered >= 3 && (
        <Button onClick={onComplete} variant="ghost" className="w-full text-white/40 hover:text-white/60">
          View current results
        </Button>
      )}

      {questionsAnswered >= MAX_QUESTIONS && (
        <div className="text-xs text-white/30 text-center">
          Maximum questions reached. View results below.
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Result ───────────────────────────────────────────────────────────

function ResultStep({
  candidates,
  profile,
  onApplyTime,
}: {
  candidates: CandidateBirthTime[];
  profile: Profile;
  onApplyTime: (time: string) => void;
}) {
  const top3 = [...candidates].sort((a, b) => b.probability - a.probability).slice(0, 3);
  const convergence = computeConvergence(candidates);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-amber-500/60 font-medium mb-1 tracking-wide uppercase">Analysis complete</div>
        <h2 className="text-2xl font-light text-white mb-2">Most probable birth time</h2>
        <p className="text-sm text-white/40">
          Based on {profile.name}'s physical appearance, palm, voice, and life events.
          Uncertainty window: ±{Math.floor(convergence.effectiveWindowMinutes / 2)} minutes.
        </p>
      </div>

      {top3.map((c, i) => (
        <div key={c.time} className={`border rounded-xl p-5 transition-all ${
          i === 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/8 bg-white/2'
        }`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-light text-white">{c.time}</span>
                {i === 0 && (
                  <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                )}
              </div>
              <div className="text-sm text-white/40 mt-0.5">
                {c.ascendantSign} rising
                {c.ascendantSubLord ? ` · ${c.ascendantSubLord} sub-lord` : ''}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-light ${i === 0 ? 'text-amber-400' : 'text-white/40'}`}>
                {(c.probability * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-white/30">confidence</div>
            </div>
          </div>

          {i === 0 && (
            <Button onClick={() => onApplyTime(c.time)} className="w-full mt-2" size="sm">
              Apply this time to {profile.name}'s chart
            </Button>
          )}
        </div>
      ))}

      <div className="bg-white/2 border border-white/6 rounded-xl p-4 text-xs text-white/30 leading-relaxed">
        <strong className="text-white/50">Important:</strong> Birth time rectification is probabilistic,
        not deterministic. The result represents the most likely range based on the evidence provided.
        Adding more life events with precise dates increases accuracy. A trained KP astrologer should
        verify the rectified time against their own analysis.
      </div>
    </div>
  );
}

// ─── Main Journey Page ────────────────────────────────────────────────────────

const STEPS = ['Starting point', 'Appearance & voice', 'Evidence interview', 'Result'];

export default function BirthCorrectionPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [candidates, setCandidates] = useState<CandidateBirthTime[]>([]);
  const [initializingCandidates, setInitializingCandidates] = useState(false);

  const addToast = useAppStore(s => s.addToast);

  useEffect(() => {
    const load = async () => {
      const p = await getProfile(profileId);
      if (!p) { router.push('/profiles'); return; }
      setProfile(p);
      setLoading(false);
    };
    load();
  }, [profileId, router]);

  const handleSeedComplete = async (windowInput: { centerTime: string | null; windowMinutes: number }) => {
    if (!profile) return;
    setInitializingCandidates(true);

    const bd = profile.birthDetails;
    const window = {
      birthDate: bd.date,
      centerTime: windowInput.centerTime,
      windowMinutes: windowInput.windowMinutes,
      latitude: bd.latitude,
      longitude: bd.longitude,
      timezone: bd.timezone,
      utcOffset: bd.utcOffset,
    };

    try {
      const res = await fetch('/api/birth-correction/init-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(window),
      });
      const data = await res.json() as { candidates: CandidateBirthTime[]; totalCount: number };
      setCandidates(data.candidates);
      setStep(1);
    } catch {
      addToast({ type: 'error', message: 'Failed to initialize candidates' });
    } finally {
      setInitializingCandidates(false);
    }
  };

  const handleApplyTime = async (time: string) => {
    if (!profile) return;
    addToast({ type: 'success', message: `Rectified time ${time} saved to ${profile.name}'s profile` });
    router.push(`/chart/${profileId}`);
  };

  if (loading) {
    return (
      <AppShell>
        <Sidebar />
        <div className="flex items-center justify-center h-64">
          <div className="text-white/30 text-sm">Loading…</div>
        </div>
        <BottomNav />
      </AppShell>
    );
  }

  if (!profile) return null;

  const birthYear = parseInt(profile.birthDetails.date.slice(0, 4), 10);

  return (
    <AppShell>
      <Sidebar />
      <PageLayout>
        <PageHeader
          title="Birth time rectification"
          description={profile.name}
          actions={
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          }
        />
        <PageContent>
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-8">
              <StepIndicator steps={STEPS} current={step} />
              {candidates.length > 0 && (
                <div className="text-xs text-white/30">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {candidates.filter(c => c.probability >= 0.01).length} candidates
                </div>
              )}
            </div>

            {initializingCandidates && (
              <div className="text-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-amber-400/60 mx-auto mb-3" />
                <div className="text-sm text-white/40">Computing birth time candidates…</div>
                <div className="text-xs text-white/20 mt-1">Calculating ascendants across the uncertainty window</div>
              </div>
            )}

            {!initializingCandidates && (
              <>
                {step === 0 && (
                  <SeedStep profile={profile} onComplete={handleSeedComplete} />
                )}

                {step === 1 && (
                  <PhysicalStep
                    candidates={candidates}
                    onComplete={(updated) => { setCandidates(updated); setStep(2); }}
                  />
                )}

                {step === 2 && (
                  <InterviewStep
                    candidates={candidates}
                    birthYear={birthYear}
                    onUpdate={(updated) => setCandidates(updated)}
                    onComplete={() => setStep(3)}
                  />
                )}

                {step === 3 && (
                  <ResultStep
                    candidates={candidates}
                    profile={profile}
                    onApplyTime={handleApplyTime}
                  />
                )}
              </>
            )}
          </div>
        </PageContent>
      </PageLayout>
      <BottomNav />
    </AppShell>
  );
}
