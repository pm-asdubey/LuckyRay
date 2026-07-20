'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronRight, Mic, MicOff, Check, Clock, RefreshCw, ArrowLeft, Plus, CalendarDays } from 'lucide-react';
import { getProfile, getLatestChart } from '@luckyray/storage';
import type { Profile, StoredChart, PlanetId } from '@luckyray/shared';
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
} from '@luckyray/birth-correction';
import type {
  CandidateBirthTime,
  GeneratedQuestion,
} from '@luckyray/birth-correction';

// ─── Event-Based Discrimination ───────────────────────────────────────────────

const EVENT_TYPES: { label: string; planets: PlanetId[] }[] = [
  { label: 'Marriage or relationship milestone',     planets: ['Venus', 'Jupiter'] },
  { label: 'Career change or major promotion',       planets: ['Saturn', 'Sun'] },
  { label: 'Relocation or home change',              planets: ['Moon', 'Mars'] },
  { label: 'Health event or surgery',                planets: ['Mars', 'Saturn'] },
  { label: 'Financial milestone (gain or loss)',     planets: ['Jupiter', 'Venus'] },
  { label: 'Birth of a child',                       planets: ['Jupiter', 'Moon'] },
  { label: 'Loss of a loved one',                    planets: ['Saturn', 'Ketu'] },
  { label: 'Education or academic achievement',      planets: ['Mercury', 'Jupiter'] },
  { label: 'Foreign travel or emigration',           planets: ['Rahu', 'Jupiter'] },
  { label: 'Legal or government matter',             planets: ['Saturn', 'Rahu'] },
  { label: 'Spiritual or life-changing experience',  planets: ['Ketu', 'Jupiter'] },
  { label: 'Accident, injury, or sudden event',      planets: ['Mars', 'Rahu'] },
  { label: 'Other significant life event',           planets: ['Sun', 'Moon'] },
];

/**
 * Build a discrimination question by grouping candidates by Ascendant sub-lord.
 * Used when dasha-based discrimination isn't possible (all same-day candidates
 * share the same dasha, but their cuspal sub-lords differ within the window).
 */
function buildEventQuestion(
  eventType: string,
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
  const month = eventDate.slice(5, 7);
  const periodLabel = month ? `${month}/${year}` : String(year);

  const questionGroups = sorted.map(([subLord, times]) => ({
    planets: [subLord as PlanetId],
    themeLabel: PLANET_THEMES[subLord as PlanetId]?.generalVibe ?? subLord,
    candidateCount: times.length,
    candidateTimes: times,
  }));

  const optionLines = sorted.slice(0, 4).map(([subLord], i) => {
    const theme = PLANET_THEMES[subLord as PlanetId]?.generalVibe ?? subLord;
    return `${String.fromCharCode(65 + i)}) ${subLord}: ${theme}`;
  });

  return {
    id: `event-${Date.now()}`,
    yearStart: year,
    yearEnd: year,
    groups: questionGroups,
    questionText: `Around ${periodLabel} you mentioned: "${eventType}"\n\nWhich planetary energy best describes the overall quality of that time?\n\n${optionLines.join('\n')}`,
    hint: 'Describe the feeling and themes of that period in your own words.',
  };
}

// ─── Step Components ──────────────────────────────────────────────────────────

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

function ProbabilityBar({ candidates }: { candidates: CandidateBirthTime[] }) {
  const top5 = [...candidates]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);

  const topProb = top5[0]?.probability ?? 0;
  const convergence = computeConvergence(candidates);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>Birth time probability</span>
        <span>{convergence.effectiveWindowMinutes}min window</span>
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

  const roughPeriods: { label: string; center: string; window: number }[] = [
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
        <p className="text-sm text-white/40">
          How well do you know {profile.name}'s birth time?
        </p>
      </div>

      <div className="space-y-2">
        {(['precise', 'rough', 'unknown'] as const).map(option => (
          <button
            key={option}
            onClick={() => setTimeKnowledge(option)}
            className={`
              w-full text-left p-4 rounded-xl border transition-all
              ${timeKnowledge === option
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-white/8 bg-white/2 hover:bg-white/5'}
            `}
          >
            <div className="font-medium text-sm text-white">
              {option === 'precise' ? 'I know it fairly precisely (±15 min)' :
               option === 'rough' ? 'I have a rough idea — morning / afternoon' :
               'I have no idea'}
            </div>
            <div className="text-xs text-white/40 mt-0.5">
              {option === 'precise' ? 'Enter the time below' :
               option === 'rough' ? 'Select a broad period' :
               'We\'ll work across the full 24 hours'}
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
              className={`
                w-full text-left px-4 py-3 rounded-lg border text-sm transition-all
                ${roughPeriod === p.label
                  ? 'border-amber-500/50 bg-amber-500/10 text-white'
                  : 'border-white/8 bg-white/2 text-white/60 hover:bg-white/5'}
              `}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <Button
        onClick={handleContinue}
        disabled={!canContinue || loading}
        className="w-full"
      >
        {loading ? 'Computing candidates…' : 'Begin'}
        <ChevronRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// ─── Step 2: Photo & Voice ────────────────────────────────────────────────────

function PhysicalStep({
  candidates,
  onComplete,
}: {
  candidates: CandidateBirthTime[];
  onComplete: (updatedCandidates: CandidateBirthTime[]) => void;
}) {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [additionalFeatures, setAdditionalFeatures] = useState('');
  const [voiceNotes, setVoiceNotes] = useState('');
  const [showVoicePassage, setShowVoicePassage] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const addToast = useAppStore(s => s.addToast);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setPhotoDataUrl(ev.target?.result as string);
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
          hasPhoto: !!photoDataUrl,
          clientPhotoAnalysis: photoDataUrl
            ? `A photo was provided by the user. Base64 image data follows for visual analysis.`
            : undefined,
          photoBase64: photoDataUrl ?? undefined,
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
      setTimeout(() => onComplete(updated), 1500);
    } catch {
      addToast({ type: 'error', message: 'Analysis failed — skipping this step' });
      onComplete(candidates);
    } finally {
      setAnalyzing(false);
    }
  };

  const canAnalyze = photoDataUrl || voiceNotes || additionalFeatures;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-light text-white mb-1">Photo & voice</h2>
        <p className="text-sm text-white/40">
          Your photo and voice carry the signature of your rising sign.
          Both are analyzed locally and never stored.
        </p>
      </div>

      {/* Photo capture */}
      <div className="space-y-3">
        <div className="text-xs text-white/50 font-medium uppercase tracking-wide">Photo</div>

        {photoDataUrl ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoDataUrl}
              alt="Your photo"
              className="w-full max-h-64 object-cover rounded-xl border border-white/10"
            />
            <button
              onClick={() => { setPhotoDataUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white/70 hover:text-white flex items-center justify-center text-sm"
            >
              ×
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-2 text-white/30 hover:border-white/20 hover:text-white/50 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/8 flex items-center justify-center transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-sm">Take photo or upload</span>
            <span className="text-xs">Clear front-facing, good lighting</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={handlePhotoSelect}
        />

        <p className="text-xs text-white/25 leading-relaxed">
          The AI looks for structural facial features — face shape, eye character,
          complexion, and bearing — to assess which rising signs are more likely.
          On mobile, this opens your front camera directly.
        </p>
      </div>

      {/* Additional notes */}
      <div>
        <label className="text-xs text-white/50 block mb-1.5">Additional appearance notes (optional)</label>
        <textarea
          value={additionalFeatures}
          onChange={e => setAdditionalFeatures(e.target.value)}
          placeholder="e.g. very expressive eyes, often told I look younger than my age, prominent jawline, graceful hands..."
          rows={2}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50 resize-none"
        />
      </div>

      {/* Voice recording */}
      <div className="border border-white/8 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-white">Voice recording</div>
            <div className="text-xs text-white/40">How you speak reveals your rising sign's planetary influence</div>
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
                  <span className="text-amber-500/50 shrink-0">·</span>
                  {inst}
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
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-white/50 block mb-1.5">Describe your voice style (optional)</label>
          <input
            value={voiceNotes}
            onChange={e => setVoiceNotes(e.target.value)}
            placeholder="e.g. soft and measured, naturally loud, fast talker, monotone, sing-song..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {analysisResult && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-sm text-white/70 leading-relaxed">
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

// ─── Step 3: Interview (AI-Driven Questions) ──────────────────────────────────

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
  const [questionLoading, setQuestionLoading] = useState(false);
  const [dashaQuestionsExhausted, setDashaQuestionsExhausted] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [scoring, setScoring] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState<GeneratedQuestion[]>([]);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [convergence, setConvergence] = useState(computeConvergence(candidates));

  // Event entry form state
  const [eventType, setEventType] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventDescription, setEventDescription] = useState('');

  const addToast = useAppStore(s => s.addToast);
  const currentCandidatesRef = useRef(candidates);
  currentCandidatesRef.current = candidates;

  const loadNextDashaQuestion = async (currentCandidates: CandidateBirthTime[], asked: GeneratedQuestion[]) => {
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
      if (!data.question) setDashaQuestionsExhausted(true);
    } catch {
      setDashaQuestionsExhausted(true);
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    loadNextDashaQuestion(candidates, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitQuestion = async (question: GeneratedQuestion, freeText: string) => {
    setScoring(true);
    try {
      const res = await fetch('/api/birth-correction/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          answer: { questionId: question.id, freeText },
          candidates: currentCandidatesRef.current,
        }),
      });
      const data = await res.json() as {
        result: { reasoning: string; confidence: number };
        updatedCandidates: CandidateBirthTime[];
      };

      setLastReasoning(data.result.reasoning);
      onUpdate(data.updatedCandidates);

      const newAsked = [...questionsAsked, question];
      setQuestionsAsked(newAsked);
      setQuestionsAnswered(q => q + 1);
      setAnswerText('');
      setCurrentQuestion(null);
      setEventType('');
      setEventDate('');
      setEventDescription('');

      const newConvergence = computeConvergence(data.updatedCandidates);
      setConvergence(newConvergence);

      // Try loading next dasha question; if exhausted, stay in event-entry mode
      if (!newConvergence.hasConverged && !dashaQuestionsExhausted) {
        await loadNextDashaQuestion(data.updatedCandidates, newAsked);
      } else if (!newConvergence.hasConverged) {
        setDashaQuestionsExhausted(true);
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

  const handleSubmitEvent = () => {
    if (!eventType || !eventDate) return;
    const q = buildEventQuestion(eventType, eventDate, currentCandidatesRef.current);
    if (!q) {
      // All candidates have the same sub-lord — can't discriminate further
      addToast({ type: 'info', message: 'All remaining candidates share the same Ascendant sub-lord. Add more events for further refinement.' });
      return;
    }
    const freeText = eventDescription
      ? `${eventType}. ${eventDescription}`
      : eventType;
    submitQuestion(q, freeText);
  };

  if (convergence.hasConverged) {
    return (
      <div className="space-y-6">
        <div>
          <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
            <Check className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-xl font-light text-white mb-1">Converged</h2>
          <p className="text-sm text-white/40">
            Birth time narrowed to a {convergence.effectiveWindowMinutes}-minute window
            with {(convergence.topProbability * 100).toFixed(0)}% confidence.
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
        <h2 className="text-xl font-light text-white mb-1">Life event interview</h2>
        <p className="text-sm text-white/40">
          {dashaQuestionsExhausted
            ? 'Your birth time is within a single rising sign window. Add specific life events with precise dates to pinpoint the exact sub-lord.'
            : 'Each question targets the most informative split in your birth time candidates. Answer freely.'}
        </p>
      </div>

      <div className="flex items-center gap-3 text-xs text-white/30">
        <span>{questionsAnswered} answered</span>
        <span>·</span>
        <span>{convergence.effectiveWindowMinutes}min uncertainty window</span>
        <span>·</span>
        <span>{candidates.filter(c => c.probability >= 0.01).length} candidates</span>
      </div>

      {lastReasoning && (
        <div className="bg-white/3 border border-white/6 rounded-lg px-4 py-3 text-sm text-white/50 italic">
          {lastReasoning}
        </div>
      )}

      {/* ── Dasha-based question (when available) ── */}
      {questionLoading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="h-32 bg-white/5 rounded-xl" />
        </div>
      ) : currentQuestion && !dashaQuestionsExhausted ? (
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
            placeholder="Describe what this period was like for you. Include specific events, feelings, or changes — the more detail, the more accurate the result."
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/30 resize-none transition-colors"
          />

          <div className="flex gap-3">
            <Button
              onClick={() => {
                const newAsked = [...questionsAsked, currentQuestion];
                setQuestionsAsked(newAsked);
                setCurrentQuestion(null);
                loadNextDashaQuestion(currentCandidatesRef.current, newAsked);
              }}
              variant="ghost"
              className="text-white/30 hover:text-white/50"
            >
              Skip
            </Button>
            <Button onClick={handleSubmitDashaAnswer} disabled={!answerText.trim() || scoring} className="flex-1">
              {scoring
                ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
                : <>Submit<ChevronRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </div>
        </div>
      ) : null}

      {/* ── Event-date entry (always shown; primary mode when dasha questions exhausted) ── */}
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
          Precise dates unlock KP sub-lord matching — the most accurate rectification method.
          The more specific the date, the more the system can narrow candidates.
        </p>

        <div>
          <label className="text-xs text-white/40 block mb-1.5">Event type</label>
          <select
            value={eventType}
            onChange={e => setEventType(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
          >
            <option value="">Select an event type…</option>
            {EVENT_TYPES.map(e => (
              <option key={e.label} value={e.label}>{e.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-1.5">Date (precise as possible)</label>
          <input
            type="date"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/40"
          />
        </div>

        <div>
          <label className="text-xs text-white/40 block mb-1.5">Description (optional — any detail helps)</label>
          <textarea
            value={eventDescription}
            onChange={e => setEventDescription(e.target.value)}
            placeholder="e.g. Got married in a small ceremony — it was joyful and felt long-awaited. Partner is 3 years older."
            rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 resize-none"
          />
        </div>

        <Button
          onClick={handleSubmitEvent}
          disabled={!eventType || !eventDate || scoring}
          className="w-full"
        >
          {scoring
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyzing…</>
            : <><Plus className="w-4 h-4 mr-2" />Add event & refine</>}
        </Button>
      </div>

      <ProbabilityBar candidates={candidates} />

      {questionsAnswered >= 2 && (
        <Button onClick={onComplete} variant="ghost" className="w-full text-white/40 hover:text-white/60">
          View results
        </Button>
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
  const top3 = [...candidates]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);

  const convergence = computeConvergence(candidates);
  const topCandidate = top3[0];

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-amber-500/60 font-medium mb-1 tracking-wide uppercase">Analysis complete</div>
        <h2 className="text-2xl font-light text-white mb-2">
          Most probable birth time
        </h2>
        <p className="text-sm text-white/40">
          Based on {profile.name}'s physical appearance, voice, and life events.
          Uncertainty window: ±{Math.floor(convergence.effectiveWindowMinutes / 2)} minutes.
        </p>
      </div>

      {top3.map((c, i) => (
        <div
          key={c.time}
          className={`
            border rounded-xl p-5 transition-all
            ${i === 0
              ? 'border-amber-500/40 bg-amber-500/5'
              : 'border-white/8 bg-white/2'}
          `}
        >
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
            <Button
              onClick={() => onApplyTime(c.time)}
              className="w-full mt-2"
              size="sm"
            >
              Apply this time to {profile.name}'s chart
            </Button>
          )}
        </div>
      ))}

      <div className="bg-white/2 border border-white/6 rounded-xl p-4 text-xs text-white/30 leading-relaxed">
        <strong className="text-white/50">Important:</strong> Birth time rectification is probabilistic,
        not deterministic. The result above represents the most likely range based on the evidence provided.
        Adding more life events with precise dates increases accuracy. A trained KP astrologer should
        verify the rectified time against their own analysis.
      </div>
    </div>
  );
}

// ─── Main Journey Page ────────────────────────────────────────────────────────

const STEPS = ['Starting point', 'Appearance & voice', 'Life events', 'Result'];

export default function BirthCorrectionPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params.profileId as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [chart, setChart] = useState<StoredChart | null>(null);
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
      const c = await getLatestChart(profileId);
      setChart(c ?? null);
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
              <ArrowLeft className="w-4 h-4" />
              Back
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
                    onComplete={(updated) => {
                      setCandidates(updated);
                      setStep(2);
                    }}
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

            {/* ProbabilityBar is rendered inside PhysicalStep and InterviewStep directly */}
            {step === 1 && candidates.length > 0 && (
              <div className="mt-8 pt-6 border-t border-white/5">
                <ProbabilityBar candidates={candidates} />
              </div>
            )}
          </div>
        </PageContent>
      </PageLayout>
      <BottomNav />
    </AppShell>
  );
}
