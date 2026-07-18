'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin, Clock, Calendar, User } from 'lucide-react';
import type { BirthDetails } from '@luckyray/shared';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

interface BirthDetailsFormProps {
  defaultValues?: Partial<{
    name: string;
    gender: 'Male' | 'Female' | 'Other';
    birthDetails: Partial<BirthDetails>;
    notes: string;
  }>;
  onSubmit: (data: {
    name: string;
    gender?: 'Male' | 'Female' | 'Other';
    birthDetails: BirthDetails;
    notes?: string;
  }) => Promise<void>;
  submitLabel?: string;
}

// Popular timezone options
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'UTC', label: 'UTC' },
];

function getTimezoneOffsetMinutes(timezone: string, date: string, time: string): number {
  try {
    const dt = new Date(`${date}T${time}:00Z`);
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(dt);
    const tzName = parts.find(p => p.type === 'timeZoneName')?.value ?? '';
    const match = tzName.match(/GMT([+-])(\d+):(\d+)/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    return sign * (parseInt(match[2]!, 10) * 60 + parseInt(match[3]!, 10));
  } catch {
    return 0;
  }
}

interface FormErrors {
  name?: string;
  date?: string;
  time?: string;
  place?: string;
  latitude?: string;
  longitude?: string;
  timezone?: string;
}

export function BirthDetailsForm({ defaultValues, onSubmit, submitLabel }: BirthDetailsFormProps) {
  const t = useTranslation();
  const [name, setName] = useState(defaultValues?.name ?? '');
  const [gender, setGender] = useState<string>(defaultValues?.gender ?? '');
  const [date, setDate] = useState(defaultValues?.birthDetails?.date ?? '');
  const [time, setTime] = useState(defaultValues?.birthDetails?.time ?? '');
  const [place, setPlace] = useState(defaultValues?.birthDetails?.place ?? '');
  const [latitude, setLatitude] = useState(defaultValues?.birthDetails?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(defaultValues?.birthDetails?.longitude?.toString() ?? '');
  const [timezone, setTimezone] = useState(defaultValues?.birthDetails?.timezone ?? 'Asia/Kolkata');
  const [notes, setNotes] = useState(defaultValues?.notes ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);

  const GENDER_OPTIONS = [
    { value: '', label: t.form.preferNotToSay },
    { value: 'Male', label: t.form.male },
    { value: 'Female', label: t.form.female },
    { value: 'Other', label: t.form.other },
  ];

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) newErrors.name = t.form.nameRequired;
    if (!date) newErrors.date = t.form.dateRequired;
    else if (new Date(date) > new Date()) newErrors.date = t.form.dateNoFuture;
    if (!time) newErrors.time = t.form.timeRequired;
    if (!place.trim()) newErrors.place = t.form.placeRequired;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (!latitude || isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = t.form.latitudeRequired;
    }
    if (!longitude || isNaN(lon) || lon < -180 || lon > 180) {
      newErrors.longitude = t.form.longitudeRequired;
    }
    if (!timezone) newErrors.timezone = t.form.timezoneRequired;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceSearch = useCallback(async () => {
    if (!place.trim()) {
      setErrors(e => ({ ...e, place: t.form.placeEnterToSearch }));
      return;
    }
    setSearching(true);
    try {
      const query = encodeURIComponent(place.trim());
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } },
      );
      if (!response.ok) throw new Error('Geocoding request failed');

      const results = await response.json() as Array<{
        lat: string; lon: string; display_name: string;
      }>;

      if (results.length === 0) {
        setErrors(e => ({ ...e, place: t.form.placeNotFound }));
        return;
      }

      const result = results[0]!;
      setLatitude(parseFloat(result.lat).toFixed(4));
      setLongitude(parseFloat(result.lon).toFixed(4));
      setPlace(result.display_name.split(',').slice(0, 2).join(',').trim());

      await guessTimezone(parseFloat(result.lat), parseFloat(result.lon));

      setErrors(e => ({ ...e, place: undefined, latitude: undefined, longitude: undefined }));
    } catch {
      setErrors(e => ({ ...e, place: t.form.placeFailed }));
    } finally {
      setSearching(false);
    }
  }, [place, t.form]);

  const guessTimezone = async (lat: number, lon: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await response.json() as { address?: { country_code?: string } };
      const cc = data.address?.country_code?.toLowerCase();
      const countryTZ: Record<string, string> = {
        'in': 'Asia/Kolkata',
        'us': 'America/New_York',
        'gb': 'Europe/London',
        'au': 'Australia/Sydney',
        'ca': 'America/Toronto',
        'sg': 'Asia/Singapore',
        'ae': 'Asia/Dubai',
        'de': 'Europe/Berlin',
        'fr': 'Europe/Paris',
        'jp': 'Asia/Tokyo',
      };
      if (cc && countryTZ[cc]) {
        setTimezone(countryTZ[cc]!);
      }
    } catch {
      // Ignore timezone guessing errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const utcOffset = getTimezoneOffsetMinutes(timezone, date, time);

      await onSubmit({
        name: name.trim(),
        gender: gender ? (gender as 'Male' | 'Female' | 'Other') : undefined,
        birthDetails: {
          date,
          time,
          place: place.trim(),
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          timezone,
          utcOffset,
        },
        notes: notes.trim() || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      {/* Personal info */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
          {t.form.personalDetails}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t.form.fullName}
            required
            value={name}
            onChange={e => setName(e.target.value)}
            error={errors.name}
            placeholder={t.form.namePlaceholder}
            leftIcon={<User size={14} />}
          />
          <Select
            label={t.form.gender}
            value={gender}
            onChange={e => setGender(e.target.value)}
            options={GENDER_OPTIONS}
          />
        </div>
        <Input
          label={t.form.notes}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t.form.notesPlaceholder}
          hint={t.form.notesHint}
        />
      </section>

      {/* Birth date & time */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
          {t.form.birthDateTime}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t.form.dateOfBirth}
            type="date"
            required
            value={date}
            onChange={e => setDate(e.target.value)}
            error={errors.date}
            leftIcon={<Calendar size={14} />}
          />
          <Input
            label={t.form.timeOfBirth}
            type="time"
            required
            value={time}
            onChange={e => setTime(e.target.value)}
            error={errors.time}
            hint={t.form.timeHint}
            leftIcon={<Clock size={14} />}
          />
        </div>
      </section>

      {/* Birth place */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
          {t.form.birthLocation}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              label={t.form.birthPlace}
              required
              value={place}
              onChange={e => setPlace(e.target.value)}
              error={errors.place}
              placeholder={t.form.birthPlacePlaceholder}
              leftIcon={<MapPin size={14} />}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePlaceSearch();
                }
              }}
            />
          </div>
          <div className="sm:mt-6 flex sm:block">
            <Button
              type="button"
              variant="secondary"
              size="md"
              loading={searching}
              onClick={handlePlaceSearch}
              className="w-full sm:w-auto"
            >
              <Search size={14} />
              {t.form.searchLocation}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t.form.latitude}
            type="number"
            step="0.0001"
            min="-90"
            max="90"
            required
            value={latitude}
            onChange={e => setLatitude(e.target.value)}
            error={errors.latitude}
            placeholder={t.form.latitudePlaceholder}
            hint={t.form.latitudeHint}
          />
          <Input
            label={t.form.longitude}
            type="number"
            step="0.0001"
            min="-180"
            max="180"
            required
            value={longitude}
            onChange={e => setLongitude(e.target.value)}
            error={errors.longitude}
            placeholder={t.form.longitudePlaceholder}
            hint={t.form.longitudeHint}
          />
        </div>

        <Select
          label={t.form.timezone}
          required
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          error={errors.timezone}
          options={TIMEZONE_OPTIONS}
          hint={t.form.timezoneHint}
        />
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={submitting} className="w-full sm:w-auto">
          {submitLabel ?? t.form.saveProfile}
        </Button>
      </div>
    </form>
  );
}
