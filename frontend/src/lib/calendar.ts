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
    const rangeDays = String(options.rangeDays);
    params.set('days', rangeDays);
    params.set('rangeDays', rangeDays);
  }
  if (options.pastDays) {
    const pastDays = String(options.pastDays);
    params.set('past_days', pastDays);
    params.set('pastDays', pastDays);
  }

  const query = params.toString();
  const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/$/, '');
  const endpointBase = configuredBase
    ? `${configuredBase}/planning/google-calendar`
    : `/api/planning/google-calendar`;
  const endpoint = query ? `${endpointBase}?${query}` : endpointBase;
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

  const raw = await response.json();

  if (raw && typeof raw === 'object' && 'fetchedAt' in raw && 'range' in raw) {
    const payload = raw as CalendarApiResponse;
    payload.events = (payload.events ?? []).map((event) => ({
      ...event,
      calendarKey: event.calendarKey || options.user || 'all',
      calendarId: event.calendarId || '',
      attendees: event.attendees || [],
    }));
    payload.warnings = payload.warnings ?? [];
    return payload;
  }

  const backendData = raw as {
    events: Array<{
      id: string;
      summary: string;
      description?: string;
      location?: string;
      start: string;
      end: string;
      status: string;
      htmlLink?: string;
    }>;
    warnings?: string[];
  };

  const now = new Date();
  const pastDays = options.pastDays ?? 3;
  const rangeDays = options.rangeDays ?? 30;

  return {
    fetchedAt: now.toISOString(),
    range: {
      timeMin: new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000).toISOString(),
      timeMax: new Date(now.getTime() + rangeDays * 24 * 60 * 60 * 1000).toISOString(),
    },
    events: (backendData.events ?? []).map((event) => ({
      id: event.id,
      calendarKey: options.user || 'all',
      calendarId: '',
      summary: event.summary,
      description: event.description || null,
      location: event.location || null,
      status: event.status || null,
      htmlLink: event.htmlLink || null,
      created: null,
      updated: null,
      hangoutLink: null,
      colorId: null,
      isAllDay: false,
      start: event.start,
      end: event.end,
      startDate: event.start,
      endDate: event.end,
      timeZone: null,
      attendees: [],
    })),
    warnings: backendData.warnings ?? [],
  };
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

