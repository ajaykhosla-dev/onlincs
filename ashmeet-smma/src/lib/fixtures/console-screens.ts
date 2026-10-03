// Fixture data for the Admin and Brand Manager screens beyond the Clients table.
// Same canonical values as docs/context.md and the approved prototypes. Anchor date: 23 September 2026.

import type { Tone } from './console'

// ── Shoots (calendar, upcoming list, drawer) ─────────────────────────────────

/** A shoot as the console shows it. `day` is the September 2026 day-of-month when it falls in the grid. */
export type ShootCard = {
  key: string
  title: string
  clientId: string
  clientName: string
  cameramanId: string
  /** drawer text, e.g. "25 Sep · 9:00 AM" */
  when: string
  /** upcoming-list time column: [date, time] */
  whenLines: [string, string]
  day?: number
  chip?: { label: string; tone: 'ram' | 'sdh' | 'bsl' | 'grv' }
  ideas: string[]
}

export const shootCards: ShootCard[] = [
  { key: 'sandhu', title: 'Sandhu site visit', clientId: 'cl-3', clientName: 'Sandhu Interiors', cameramanId: 'u-7', when: '24 Sep · 4:00 PM', whenLines: ['24 Sep', '4:00 PM'], day: 24, chip: { label: 'Sandhu · 4:00 PM', tone: 'sdh' }, ideas: ['Modular kitchen reveal', 'Client testimonial — Mrs. Bedi'] },
  { key: 'ramana', title: 'Ramana shoot', clientId: 'cl-1', clientName: 'Ramana Dental', cameramanId: 'u-8', when: '25 Sep · 9:00 AM', whenLines: ['25 Sep', '9:00 AM'], day: 25, chip: { label: 'Ramana · 9:00 AM', tone: 'ram' }, ideas: ['Smile makeover before/after', 'Root canal myths'] },
  { key: 'basil', title: 'Basil shoot', clientId: 'cl-5', clientName: 'Basil Café', cameramanId: 'u-7', when: '26 Sep · 8:00 AM', whenLines: ['26 Sep', '8:00 AM'], day: 26, chip: { label: 'Basil · 8:00 AM', tone: 'bsl' }, ideas: ['New season menu', "Barista's pick"] },
  { key: 'grover', title: 'Grover showroom shoot', clientId: 'cl-2', clientName: 'Grover Motors', cameramanId: 'u-8', when: '2 Oct · 11:30 AM', whenLines: ['2 Oct', '11:30 AM'], ideas: ['Service package explainer'] },
]

// ── Editors' den ─────────────────────────────────────────────────────────────

export type DenRow = {
  key: string
  clientId: string
  idea: string
  clientName: string
  editorId: string
  version: number
  deadline: string
  status: { label: string; tone: Tone }
}

export const denRows: DenRow[] = [
  { key: 'diwali', clientId: 'cl-4', idea: 'Diwali offer reel · cut 3', clientName: 'Khanna Jewellers', editorId: 'u-6', version: 3, deadline: '6d late', status: { label: 'Changes requested', tone: 'pink' } },
  { key: 'menu', clientId: 'cl-5', idea: 'New season menu', clientName: 'Basil Café', editorId: 'u-5', version: 1, deadline: 'Due today', status: { label: 'Cut submitted', tone: 'amber' } },
  { key: 'barista', clientId: 'cl-5', idea: "Barista's pick", clientName: 'Basil Café', editorId: 'u-6', version: 2, deadline: '24 Sep', status: { label: 'Cut submitted', tone: 'lav' } },
  { key: 'kitchen', clientId: 'cl-3', idea: 'Modular kitchen reveal', clientName: 'Sandhu Interiors', editorId: 'u-5', version: 1, deadline: '27 Sep', status: { label: 'Cut submitted', tone: 'lav' } },
]

/** Timestamped review comments on the Diwali reel (one is a client voice note with transcript). */
export type ReviewComment = { id: string; range: string; author: string; text?: string; voice?: { duration: string; transcript: string } }

export const diwaliComments: ReviewComment[] = [
  { id: 'c-1', range: '0:11–0:14', author: 'Nikhil Sharma', text: 'The offer text is covering the product shot here — push it down or shrink it.' },
  { id: 'c-2', range: '0:38–0:41', author: 'Nikhil Sharma', text: 'Music drops out oddly on the cut. Can we crossfade instead?' },
  { id: 'c-3', range: '1:02–1:07', author: 'Khanna Jewellers (client)', voice: { duration: '0:09', transcript: '"Can you end on the diya shot instead of the logo? Feels more festive to close on."' } },
]

// ── Posting schedule ─────────────────────────────────────────────────────────

export type PostItem = {
  key: string
  day: number
  chip: string
  chipTone: 'ram' | 'sdh' | 'bsl' | 'grv'
  panelTitle: string
  name: string
  meta: string
  caption: string
  music: string
}

export const postItems: PostItem[] = [
  { key: 'showroom', day: 20, chip: 'Grover · 10:00 AM', chipTone: 'bsl', panelTitle: '20 September', name: 'Showroom walkthrough', meta: 'Grover Motors · 10:00 AM · Reel', caption: '"See the new showroom floor before anyone else does."', music: 'Music: Ambient corporate, licensed bed "Skyline"' },
  { key: 'service', day: 28, chip: 'Grover · 5:00 PM', chipTone: 'bsl', panelTitle: '28 September', name: 'Service package explainer', meta: 'Grover Motors · 5:00 PM · Reel', caption: '"Book your free service check this Diwali — link in bio."', music: 'Music: Upbeat instrumental, licensed bed "Momentum"' },
  { key: 'rootcanal', day: 30, chip: 'Ramana · 9:00 AM', chipTone: 'ram', panelTitle: '30 September', name: 'Root canal myths', meta: 'Ramana Dental · 9:00 AM · Carousel', caption: '"5 things your dentist wishes you knew about root canals."', music: 'Music: None (carousel)' },
]

// ── Content planner (Ramana Dental, September) ───────────────────────────────

export type PlanItem = {
  key: string
  day: number
  type: string
  stage: { label: string; tone: Tone }
  panelTitle: string
  name: string
  meta: string
  tone: 'sky' | 'lav'
}

export const planItems: PlanItem[] = [
  { key: 'rootcanal', day: 24, type: 'Reel', stage: { label: 'With client', tone: 'sky' }, panelTitle: '24 September', name: 'Root canal myths', meta: 'Reel · With client', tone: 'sky' },
  { key: 'smile', day: 30, type: 'Reel', stage: { label: 'With editor', tone: 'lav' }, panelTitle: '30 September', name: 'Smile makeover before/after', meta: 'Reel · With editor', tone: 'lav' },
]

// ── Team performance ─────────────────────────────────────────────────────────

export type PerformanceRow = {
  memberId: string
  roleLabel: string
  roleTone: Tone
  assigned: string
  delivered: string
  revisions: string
  turnaround: string
  onTime: { label: string; tone: Tone }
}

export const teamPerformance: PerformanceRow[] = [
  { memberId: 'u-2', roleLabel: 'Brand Manager', roleTone: 'lav', assigned: 'Ramana Dental, Grover Motors', delivered: '34', revisions: '1.2', turnaround: '2.1d', onTime: { label: '92%', tone: 'mint' } },
  { memberId: 'u-3', roleLabel: 'Brand Manager', roleTone: 'lav', assigned: 'Sandhu Interiors, Khanna Jewellers', delivered: '17', revisions: '2.4', turnaround: '3.6d', onTime: { label: '61%', tone: 'pink' } },
  { memberId: 'u-4', roleLabel: 'Brand Manager', roleTone: 'lav', assigned: 'Basil Café, Verdant Gym', delivered: '9', revisions: '1.0', turnaround: '1.8d', onTime: { label: '100%', tone: 'mint' } },
  { memberId: 'u-5', roleLabel: 'Editor', roleTone: 'sky', assigned: 'All clients', delivered: '22', revisions: '1.6', turnaround: '1.4d', onTime: { label: '88%', tone: 'mint' } },
  { memberId: 'u-6', roleLabel: 'Editor', roleTone: 'sky', assigned: 'All clients', delivered: '19', revisions: '2.1', turnaround: '2.0d', onTime: { label: '74%', tone: 'amber' } },
  { memberId: 'u-7', roleLabel: 'Cameraman', roleTone: 'grey', assigned: 'All clients', delivered: '12 shoots', revisions: '—', turnaround: '—', onTime: { label: '95%', tone: 'mint' } },
  { memberId: 'u-8', roleLabel: 'Cameraman', roleTone: 'grey', assigned: 'All clients', delivered: '10 shoots', revisions: '—', turnaround: '—', onTime: { label: '80%', tone: 'amber' } },
]

/** Settings > Team members: the owner is labelled "Owner", managers sky, the rest grey. */
export const settingsRoles: Record<string, { label: string; tone: Tone }> = {
  admin: { label: 'Owner', tone: 'lav' },
  brand_manager: { label: 'Brand Manager', tone: 'sky' },
  editor: { label: 'Editor', tone: 'grey' },
  cameraman: { label: 'Cameraman', tone: 'grey' },
}

// ── Brand Manager (Jaspreet Kaur: Ramana Dental and Grover Motors only) ───────

/** Shoots for Jaspreet's two clients. */
export const jaspreetShoots: ShootCard[] = shootCards.filter((s) => s.clientId === 'cl-1' || s.clientId === 'cl-2')

export const jaspreetDenRows: DenRow[] = [
  { key: 'rootcanal', clientId: 'cl-1', idea: 'Root canal myths', clientName: 'Ramana Dental', editorId: 'u-5', version: 2, deadline: '2d late', status: { label: 'Client changes requested', tone: 'pink' } },
  { key: 'service', clientId: 'cl-2', idea: 'Service package explainer', clientName: 'Grover Motors', editorId: 'u-6', version: 1, deadline: '25 Sep', status: { label: 'Cut submitted', tone: 'lav' } },
]

export const rootCanalComments: ReviewComment[] = [
  { id: 'rc-1', range: '0:04–0:08', author: 'Ramana Dental (client)', text: 'Can we replace the stock X-ray with the one from our own patient records folder?' },
  { id: 'rc-2', range: '0:29–0:33', author: 'Ramana Dental (client)', text: `The doctor's name is spelled wrong on the lower third — it's "Dr. Anmol Kohli".` },
]

/** Grover posts on the Brand Manager grid use the mint chip (the admin prototype uses the sky one). */
export const jaspreetPostItems: PostItem[] = postItems.filter((p) => p.key !== 'rootcanal').map((p) => ({ ...p, chipTone: 'grv' as const }))

/** "Schedule a shoot" modal: the content ideas a manager can attach to a shoot. */
export const scheduleIdeas: { label: string; checked: boolean }[] = [
  { label: 'Smile makeover before/after', checked: true },
  { label: 'Root canal myths', checked: false },
  { label: 'New patient walk-in day', checked: false },
  { label: 'Staff introduction reel', checked: false },
]
