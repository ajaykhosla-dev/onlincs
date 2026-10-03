// Static fixture data for the Admin and Brand Manager screens (Phase 1: no database reads).
// Entities extend the Phase 0 database types, so Phase 3 can swap a fixture import for a query.
// Values are the canonical ones in docs/context.md. Anchor date: 23 September 2026.

import type { Client, User } from '@/types/database'

export type Tone = 'grey' | 'lav' | 'amber' | 'pink' | 'mint' | 'sky'

export type TeamMember = Pick<User, 'id' | 'full_name' | 'initials' | 'role' | 'avatar_gradient' | 'email' | 'phone'> & { first_name: string }

export const team: TeamMember[] = [
  { id: 'u-1', full_name: 'Ashmeet Chaurasia', first_name: 'Ashmeet', initials: 'AC', role: 'admin', avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)', email: 'ashmeet@ashmeetsmma.com', phone: '+919876543210' },
  { id: 'u-2', full_name: 'Jaspreet Kaur', first_name: 'Jaspreet', initials: 'JK', role: 'brand_manager', avatar_gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)', email: 'jaspreet@ashmeetsmma.com', phone: '+919876543211' },
  { id: 'u-3', full_name: 'Nikhil Sharma', first_name: 'Nikhil', initials: 'NS', role: 'brand_manager', avatar_gradient: 'linear-gradient(140deg,#F8A0BC,#DF5A86)', email: 'nikhil@ashmeetsmma.com', phone: '+919876543212' },
  { id: 'u-4', full_name: 'Manreet Gill', first_name: 'Manreet', initials: 'MG', role: 'brand_manager', avatar_gradient: 'linear-gradient(140deg,#63DCA9,#1FA772)', email: 'manreet@ashmeetsmma.com', phone: '+919876543213' },
  { id: 'u-5', full_name: 'Rohit Bansal', first_name: 'Rohit', initials: 'RB', role: 'editor', avatar_gradient: 'linear-gradient(140deg,#62A0F2,#14539F)', email: 'rohit@ashmeetsmma.com', phone: '+919876543214' },
  { id: 'u-6', full_name: 'Simran Kaur', first_name: 'Simran', initials: 'SK', role: 'editor', avatar_gradient: 'linear-gradient(140deg,#FFC974,#DF8A0E)', email: 'simran@ashmeetsmma.com', phone: '+919876543215' },
  { id: 'u-7', full_name: 'Harpreet Singh', first_name: 'Harpreet', initials: 'HS', role: 'cameraman', avatar_gradient: 'linear-gradient(140deg,#63DCA9,#1FA772)', email: 'harpreet@ashmeetsmma.com', phone: '+919876543216' },
  { id: 'u-8', full_name: 'Vikram Rana', first_name: 'Vikram', initials: 'VR', role: 'cameraman', avatar_gradient: 'linear-gradient(140deg,#62A0F2,#14539F)', email: 'vikram@ashmeetsmma.com', phone: '+919876543217' },
]

export const teamById = (id: string | null) => team.find((m) => m.id === id)

/** A client as the console tables show it: the database row plus presentation facts. */
export type ClientRow = Pick<Client, 'id' | 'code' | 'name' | 'handle' | 'manager_id'> & {
  monogram: string
  gradient: string
  niche: string
  nicheTone: Tone
  /** Items delivered / scope of work for the month (docs/context.md). */
  delivered: number
  sow: number
  /** Progress bar emphasis: 'done' at 100%, 'warn' when behind. */
  bar?: 'warn' | 'done'
  nextShoot: string | null
  attention: { label: string; tone: Tone }
}

export const clientRows: ClientRow[] = [
  { id: 'cl-1', code: 'RAM-01', name: 'Ramana Dental', handle: '@ramanadental', manager_id: 'u-2', monogram: 'RD', gradient: 'linear-gradient(140deg,#8F80F7,#5A4AD8)', niche: 'Healthcare', nicheTone: 'mint', delivered: 14, sow: 20, nextShoot: '25 Sep · 9:00 AM', attention: { label: '2 approvals due', tone: 'amber' } },
  { id: 'cl-2', code: 'GRV-02', name: 'Grover Motors', handle: '@grovermotors', manager_id: 'u-2', monogram: 'GM', gradient: 'linear-gradient(140deg,#63DCA9,#1FA772)', niche: 'Automotive', nicheTone: 'sky', delivered: 20, sow: 20, bar: 'done', nextShoot: '2 Oct · 11:30 AM', attention: { label: 'On track', tone: 'mint' } },
  { id: 'cl-3', code: 'SDH-03', name: 'Sandhu Interiors', handle: '@sandhu.interiors', manager_id: 'u-3', monogram: 'SI', gradient: 'linear-gradient(140deg,#FFC974,#DF8A0E)', niche: 'Interiors', nicheTone: 'lav', delivered: 6, sow: 16, bar: 'warn', nextShoot: '24 Sep · 4:00 PM', attention: { label: '4 approvals due', tone: 'amber' } },
  { id: 'cl-4', code: 'KHN-04', name: 'Khanna Jewellers', handle: '@khannajewellers', manager_id: 'u-3', monogram: 'KJ', gradient: 'linear-gradient(140deg,#F4739F,#BE2358)', niche: 'Retail', nicheTone: 'amber', delivered: 11, sow: 18, bar: 'warn', nextShoot: null, attention: { label: '6 days late', tone: 'pink' } },
  { id: 'cl-5', code: 'BSL-05', name: 'Basil Café', handle: '@basil.ldh', manager_id: 'u-4', monogram: 'BC', gradient: 'linear-gradient(140deg,#62A0F2,#14539F)', niche: 'Food & beverage', nicheTone: 'sky', delivered: 9, sow: 12, nextShoot: '26 Sep · 8:00 AM', attention: { label: '1 approval due', tone: 'amber' } },
  { id: 'cl-6', code: 'VRD-06', name: 'Verdant Gym', handle: '@verdant.fit', manager_id: 'u-4', monogram: 'VG', gradient: 'linear-gradient(140deg,#BDBDD2,#8686A4)', niche: 'Fitness', nicheTone: 'grey', delivered: 0, sow: 10, nextShoot: null, attention: { label: 'Onboarding', tone: 'grey' } },
]

export const scopePercent = (c: Pick<ClientRow, 'delivered' | 'sow'>) => Math.round((c.delivered / c.sow) * 100)

/** "Waiting on you" queue on the admin Clients screen. */
export type QueueItem = { id: string; icon: 'video' | 'calendar' | 'person' | 'clock'; tone: 'pink' | 'amber' | 'lav'; title: string; meta: string; age: string }

export const waitingOnYou: QueueItem[] = [
  { id: 'q-1', icon: 'video', tone: 'pink', title: 'Diwali offer reel · cut 3', meta: 'Khanna Jewellers · Nikhil', age: '6d' },
  { id: 'q-2', icon: 'calendar', tone: 'amber', title: 'October calendar approval', meta: 'Sandhu Interiors · Nikhil', age: '2d' },
  { id: 'q-3', icon: 'person', tone: 'lav', title: 'Assign a manager', meta: 'Verdant Gym · unassigned', age: 'New' },
]

export const clientById = (id: string) => clientRows.find((c) => c.id === id)

/** "Waiting on you" for Jaspreet Kaur's two accounts. */
export const waitingOnJaspreet: QueueItem[] = [
  { id: 'mq-1', icon: 'video', tone: 'amber', title: 'Smile makeover before/after', meta: 'Ramana Dental · cut submitted', age: '1d' },
  { id: 'mq-2', icon: 'clock', tone: 'lav', title: 'Service package explainer', meta: 'Grover Motors · ready to schedule', age: 'New' },
]

/** Jaspreet Kaur's clients (docs/context.md: Ramana Dental and Grover Motors). */
export const jaspreetClients = clientRows.filter((c) => c.manager_id === 'u-2')
