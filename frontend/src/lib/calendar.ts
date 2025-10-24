import { format } from 'date-fns';
import type { AuthUser, Slot } from '../store/useAppData';

export type CalendarAttendee = {
  email: string | null;
  displayName: string | null;
  responseStatus: string | null;
  optional: boolean;
  organizer: boolean;
  self: boolean;
};

export type CalendarEvent = {
  id: string;
  calendarKey: string;
  calendarId: string;
  summary: string;
  description: string | null;
  location: string | null;
  status: string | null;
  htmlLink: string | null;
  created: string | null;
  updated: string | null;
  hangoutLink: string | null;
  colorId: string | null;
  isAllDay: boolean;
  start: string | null;
  end: string | null;
  startDate: string | null;
  endDate: string | null;
  timeZone: string | null;
  attendees: CalendarAttendee[];
};

export type CalendarRange = {
  timeMin: string;
  timeMax: string;
};

export type CalendarApiResponse = {
  fetchedAt: string;
  range: CalendarRange;
  events: CalendarEvent[];
  warnings?: string[];
};

export type FetchCalendarOptions = {
  user?: string | null;
  rangeDays?: number;
  pastDays?: number;
  signal?: AbortSignal;
};

const parseDate = (value: string | null | undefined) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const fallbackDurationMs = 60 * 60 * 1000;

export const calendarEventToSlot = (event: CalendarEvent): Slot => {
  const startSource = event.start ?? event.startDate;
  const endSource = event.end ?? event.endDate;
  const start = parseDate(startSource) ?? new Date();
  const endCandidate = parseDate(endSource);
  const end = endCandidate && endCandidate.getTime() > start.getTime()
    ? endCandidate
    : new Date(start.getTime() + fallbackDurationMs);
  const slotId = `gcal-${event.calendarKey}-${event.id}`;
  return {
    id: slotId,
    date: format(start, 'yyyy-MM-dd'),
    start: format(start, "HH'h'mm"),
    end: format(end, "HH'h'mm"),
  };
};

export const calendarEventsToSlots = (events: CalendarEvent[]) => {
  const eventsBySlotId = new Map<string, CalendarEvent>();
  const slots: Slot[] = [];
  events.forEach((event) => {
    const slot = calendarEventToSlot(event);
    eventsBySlotId.set(slot.id, event);
    slots.push(slot);
  });
  return { slots, eventsBySlotId };
};

export const fetchCalendarEvents = async (
  options: FetchCalendarOptions = {}
): Promise<CalendarApiResponse> => {
  const params = new URLSearchParams();
  if (options.user) {
    params.set('user', options.user);
  }
  if (options.rangeDays) {
    params.set('rangeDays', String(options.rangeDays));
  }
  if (options.pastDays) {
    params.set('pastDays', String(options.pastDays));
  }

  const query = params.toString();
  const endpoint = query ? `/api/planning-google?${query}` : '/api/planning-google';
  const response = await fetch(endpoint, {
    method: 'GET',
    signal: options.signal,
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Calendar sync failed with status ${response.status}`);
  }

  const payload = (await response.json()) as CalendarApiResponse;
  return payload;
};

const normalise = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

export const resolveCalendarKeyForUser = (user: AuthUser | null) => {
  if (!user) {
    return undefined;
  }
  const tokens = [
    normalise(user.fullName),
    normalise(user.username),
    normalise(user.profile?.firstName),
    normalise(user.profile?.lastName),
  ].filter(Boolean);

  if (tokens.some((token) => token.includes('adrien'))) {
    return 'adrien';
  }
  if (tokens.some((token) => token.includes('clément') || token.includes('clement'))) {
    return 'clement';
  }
  return undefined;
};

