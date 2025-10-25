import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google, type calendar_v3 } from 'googleapis'

type CalendarAttendee = {
  email: string | null
  displayName: string | null
  responseStatus: string | null
  optional: boolean
  organizer: boolean
  self: boolean
}

type CalendarEventPayload = {
  id: string
  calendarKey: string
  calendarId: string
  summary: string
  description: string | null
  location: string | null
  status: string | null
  htmlLink: string | null
  created: string | null
  updated: string | null
  hangoutLink: string | null
  colorId: string | null
  isAllDay: boolean
  start: string | null
  end: string | null
  startDate: string | null
  endDate: string | null
  timeZone: string | null
  attendees: CalendarAttendee[]
}

type CalendarRange = {
  timeMin: string
  timeMax: string
}

type CalendarResponse = {
  fetchedAt: string
  range: CalendarRange
  events: CalendarEventPayload[]
  warnings: string[]
}

type CalendarConfig = {
  calendarId?: string
  serviceAccountJson?: string
}

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

const CALENDAR_CONFIGS: Record<string, CalendarConfig> = {
  adrien: {
    calendarId: process.env.CALENDAR_ID_ADRIEN,
    serviceAccountJson: process.env.GOOGLE_SA_ADRIEN_JSON,
  },
  clement: {
    calendarId: process.env.CALENDAR_ID_CLEMENT,
    serviceAccountJson: process.env.GOOGLE_SA_CLEMENT_JSON,
  },
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const parseIntegerParam = (value: unknown, fallback: number) => {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback
  }
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    return fallback
  }
  return parsed
}

const parseDateParam = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed
}

const normaliseKey = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : undefined

const parseServiceAccount = (raw: string | undefined | null) => {
  if (!raw) {
    return null
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const credentials = { ...parsed } as Record<string, unknown> & { private_key?: string }
    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n')
    }
    return credentials
  } catch (error) {
    console.error('[Wash&Go] Invalid Google service account payload', error)
    return null
  }
}

const resolveEventDateTime = (value?: calendar_v3.Schema$EventDateTime | null) => {
  if (!value) {
    return {
      iso: null,
      date: null,
      dateTime: null,
      timeZone: null,
      isAllDay: false,
    }
  }
  if (value.dateTime) {
    const parsed = new Date(value.dateTime)
    const iso = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
    return {
      iso,
      date: value.date ?? null,
      dateTime: value.dateTime,
      timeZone: value.timeZone ?? null,
      isAllDay: false,
    }
  }
  if (value.date) {
    const isoCandidate = `${value.date}T00:00:00`
    const parsed = new Date(isoCandidate)
    const iso = Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
    return {
      iso,
      date: value.date,
      dateTime: null,
      timeZone: value.timeZone ?? null,
      isAllDay: true,
    }
  }
  return {
    iso: null,
    date: null,
    dateTime: null,
    timeZone: value.timeZone ?? null,
    isAllDay: false,
  }
}

const mapAttendees = (attendees?: calendar_v3.Schema$EventAttendee[] | null): CalendarAttendee[] => {
  if (!Array.isArray(attendees) || attendees.length === 0) {
    return []
  }
  return attendees.map((attendee) => ({
    email: attendee.email ?? null,
    displayName: attendee.displayName ?? null,
    responseStatus: attendee.responseStatus ?? null,
    optional: Boolean(attendee.optional),
    organizer: Boolean(attendee.organizer),
    self: Boolean(attendee.self),
  }))
}

const mapEvent = (
  event: calendar_v3.Schema$Event,
  calendarKey: string,
  calendarId: string,
  fallbackTimeZone: string | null,
): CalendarEventPayload => {
  const start = resolveEventDateTime(event.start)
  const end = resolveEventDateTime(event.end)
  const eventId = event.id || `${calendarKey}-${start.iso ?? Date.now()}`
  return {
    id: eventId,
    calendarKey,
    calendarId,
    summary: event.summary ?? 'Événement',
    description: event.description ?? null,
    location: event.location ?? null,
    status: event.status ?? null,
    htmlLink: event.htmlLink ?? null,
    created: event.created ?? null,
    updated: event.updated ?? null,
    hangoutLink: event.hangoutLink ?? null,
    colorId: event.colorId ?? null,
    isAllDay: start.isAllDay,
    start: start.iso,
    end: end.iso,
    startDate: start.date ?? (start.isAllDay ? start.iso?.slice(0, 10) ?? null : null),
    endDate: end.date ?? (end.isAllDay ? end.iso?.slice(0, 10) ?? null : null),
    timeZone: start.timeZone ?? end.timeZone ?? fallbackTimeZone,
    attendees: mapAttendees(event.attendees),
  }
}

const fetchCalendarEvents = async (
  key: string,
  config: CalendarConfig,
  range: CalendarRange,
  warnings: string[],
): Promise<CalendarEventPayload[]> => {
  if (!config.calendarId) {
    warnings.push(`Aucun identifiant de calendrier configuré pour "${key}".`)
    return []
  }

  const credentials = parseServiceAccount(config.serviceAccountJson)
  if (!credentials) {
    warnings.push(`Compte de service Google invalide pour "${key}".`)
    return []
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: SCOPES,
    })
    const calendar = google.calendar({ version: 'v3', auth })
    const response = await calendar.events.list({
      calendarId: config.calendarId,
      timeMin: range.timeMin,
      timeMax: range.timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
      showDeleted: false,
    })

    const timeZone = response.data.timeZone ?? null
    const items = response.data.items ?? []

    return items.map((item) => mapEvent(item, key, config.calendarId!, timeZone))
  } catch (error) {
    console.error(`[Wash&Go] Google Calendar sync failed for ${key}`, error)
    warnings.push(`Impossible de synchroniser le calendrier "${key}".`)
    return []
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method_not_allowed' })
  }

  const requestedKey = normaliseKey(req.query.user)
  const knownKeys = Object.keys(CALENDAR_CONFIGS)
  const targetKeys = requestedKey ? [requestedKey] : knownKeys

  const calendarRangeDays = clamp(
    parseIntegerParam(req.query.rangeDays ?? req.query.days, 30),
    1,
    180,
  )
  const pastDays = clamp(
    parseIntegerParam(req.query.pastDays ?? req.query.past_days, 3),
    0,
    90,
  )

  const explicitMin = parseDateParam(req.query.timeMin ?? req.query.time_min)
  const explicitMax = parseDateParam(req.query.timeMax ?? req.query.time_max)

  const now = new Date()
  const rangeStart = explicitMin ?? new Date(now)
  rangeStart.setHours(0, 0, 0, 0)
  rangeStart.setDate(rangeStart.getDate() - pastDays)

  const rangeEnd = explicitMax ?? new Date(rangeStart)
  rangeEnd.setHours(23, 59, 59, 999)
  if (!explicitMax) {
    rangeEnd.setDate(rangeStart.getDate() + calendarRangeDays)
  }

  if (rangeEnd.getTime() < rangeStart.getTime()) {
    rangeEnd.setTime(rangeStart.getTime())
  }

  const range: CalendarRange = {
    timeMin: rangeStart.toISOString(),
    timeMax: rangeEnd.toISOString(),
  }

  const warnings: string[] = []
  const events: CalendarEventPayload[] = []

  for (const key of targetKeys) {
    if (!CALENDAR_CONFIGS[key]) {
      warnings.push(`Calendrier inconnu "${key}".`)
      continue
    }
    const calendarEvents = await fetchCalendarEvents(key, CALENDAR_CONFIGS[key], range, warnings)
    events.push(...calendarEvents)
  }

  events.sort((a, b) => {
    const aTime = a.start ? new Date(a.start).getTime() : 0
    const bTime = b.start ? new Date(b.start).getTime() : 0
    return aTime - bTime
  })

  const payload: CalendarResponse = {
    fetchedAt: new Date().toISOString(),
    range,
    events,
    warnings,
  }

  return res.status(200).json(payload)
}
