'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin, Clock, Calendar, User } from 'lucide-react';
import type { BirthDetails } from '@luckyray/shared';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

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
  // Use Intl.DateTimeFormat with longOffset to reliably get the UTC offset for a specific
  // timezone at a specific datetime, properly accounting for DST transitions.
  // We pass the birth datetime as UTC (suffix 'Z') and read back what the offset would be.
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

export function BirthDetailsForm({ defaultValues, onSubmit, submitLabel = 'Save profile' }: BirthDetailsFormProps) {
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) newErrors.name = 'Name is required';
    if (!date) newErrors.date = 'Date of birth is required';
    else if (new Date(date) > new Date()) newErrors.date = 'Date cannot be in the future';
    if (!time) newErrors.time = 'Time of birth is required';
    if (!place.trim()) newErrors.place = 'Birth place is required';

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (!latitude || isNaN(lat) || lat < -90 || lat > 90) {
      newErrors.latitude = 'Valid latitude required (-90 to 90)';
    }
    if (!longitude || isNaN(lon) || lon < -180 || lon > 180) {
      newErrors.longitude = 'Valid longitude required (-180 to 180)';
    }
    if (!timezone) newErrors.timezone = 'Timezone is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePlaceSearch = useCallback(async () => {
    if (!place.trim()) {
      setErrors(e => ({ ...e, place: 'Enter a place name to search' }));
      return;
    }
    setSearching(true);
    try {
      // Use the Nominatim geocoding API (OpenStreetMap, free, no key required)
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
        setErrors(e => ({ ...e, place: 'Location not found. Try a more specific name.' }));
        return;
      }

      const result = results[0]!;
      setLatitude(parseFloat(result.lat).toFixed(4));
      setLongitude(parseFloat(result.lon).toFixed(4));
      setPlace(result.display_name.split(',').slice(0, 2).join(',').trim());

      // Try to guess timezone from coordinates
      await guessTimezone(parseFloat(result.lat), parseFloat(result.lon));

      setErrors(e => ({ ...e, place: undefined, latitude: undefined, longitude: undefined }));
    } catch {
      setErrors(e => ({ ...e, place: 'Failed to search location. Please enter coordinates manually.' }));
    } finally {
      setSearching(false);
    }
  }, [place]);

  const guessTimezone = async (lat: number, lon: number) => {
    // Use Nominatim reverse geocoding to get country code, then guess timezone
    // This is a best-effort approach; user can always correct it
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const data = await response.json() as { address?: { country_code?: string } };
      const cc = data.address?.country_code?.toLowerCase();
      // Map common country codes to sensible default timezones
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
      // Compute UTC offset for the selected timezone at the birth date (accounts for DST)
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
          Personal details
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            error={errors.name}
            placeholder="Enter name"
            leftIcon={<User size={14} />}
          />
          <Select
            label="Gender"
            value={gender}
            onChange={e => setGender(e.target.value)}
            options={GENDER_OPTIONS}
          />
        </div>
        <Input
          label="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes about this profile"
          hint="Visible only to you, stored locally"
        />
      </section>

      {/* Birth date & time */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
          Birth date & time
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date of birth"
            type="date"
            required
            value={date}
            onChange={e => setDate(e.target.value)}
            error={errors.date}
            leftIcon={<Calendar size={14} />}
          />
          <Input
            label="Time of birth"
            type="time"
            required
            value={time}
            onChange={e => setTime(e.target.value)}
            error={errors.time}
            hint="24-hour format"
            leftIcon={<Clock size={14} />}
          />
        </div>
      </section>

      {/* Birth place */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-content-muted uppercase tracking-wider">
          Birth location
        </h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1">
            <Input
              label="Birth place"
              required
              value={place}
              onChange={e => setPlace(e.target.value)}
              error={errors.place}
              placeholder="City, Country (e.g. Mumbai, India)"
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
              Search location
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Latitude"
            type="number"
            step="0.0001"
            min="-90"
            max="90"
            required
            value={latitude}
            onChange={e => setLatitude(e.target.value)}
            error={errors.latitude}
            placeholder="e.g. 19.0760"
            hint="Decimal degrees, N is positive"
          />
          <Input
            label="Longitude"
            type="number"
            step="0.0001"
            min="-180"
            max="180"
            required
            value={longitude}
            onChange={e => setLongitude(e.target.value)}
            error={errors.longitude}
            placeholder="e.g. 72.8777"
            hint="Decimal degrees, E is positive"
          />
        </div>

        <Select
          label="Timezone"
          required
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
          error={errors.timezone}
          options={TIMEZONE_OPTIONS}
          hint="Select the timezone at the birth location"
        />
      </section>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" variant="primary" loading={submitting} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
