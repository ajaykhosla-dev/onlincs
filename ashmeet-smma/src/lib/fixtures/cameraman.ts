// Fixture data for the Cameraman screens (Harpreet Singh): the shoot schedule for 20–26 September 2026.
// Same canonical values as docs/context.md and the approved cameraman.html. "Today" is fixed at 23 Sep 2026, 4:20 PM.

export type ShootState = 'completed' | 'raw-missing' | 'upcoming'

export type ShootIdea = { name: string; concept: string; script: string }

export type CamShoot = {
  id: string
  /** Calendar day, local time, as [year, month (1-12), day] */
  date: [number, number, number]
  /** Decimal hours: 16 = 4:00 PM, 10.5 = 10:30 AM */
  start: number
  end: number
  client: string
  name: string
  location: string
  state: ShootState
  ideas: ShootIdea[]
}

export const TODAY: [number, number, number] = [2026, 9, 23]
export const NOW_HOUR = 16 + 20 / 60 // 4:20 PM

export const camShoots: CamShoot[] = [
  {
    id: 'basil-founder', date: [2026, 9, 20], start: 9, end: 10.5, client: 'Basil Café', name: 'Founder day shoot',
    location: 'Sarabha Nagar, Ludhiana', state: 'raw-missing',
    ideas: [
      { name: 'Founder day interview', concept: 'Sit-down with the founder about why the café started.', script: "Ask: what made you open Basil Café? What's one dish you're proudest of?" },
      { name: 'Kitchen morning routine', concept: 'Early prep footage before opening — chopping, plating, coffee setup.', script: 'Handheld, fly-on-the-wall style. No posed shots.' },
    ],
  },
  {
    id: 'ramana-broll', date: [2026, 9, 22], start: 15, end: 17, client: 'Ramana Dental', name: 'Clinic b-roll',
    location: 'Model Town, Ludhiana', state: 'completed',
    ideas: [
      { name: 'Clinic front desk b-roll', concept: 'Clean establishing shots of reception and waiting area.', script: 'Wide shot on arrival, slow pan across the seating, close-up on the welcome sign.' },
      { name: 'Equipment sterilization walkthrough', concept: 'Footage of the sterilization process for a trust-building post.', script: 'Macro shots of tools going through the autoclave, no patients in frame.' },
    ],
  },
  {
    id: 'sandhu-site', date: [2026, 9, 24], start: 16, end: 18, client: 'Sandhu Interiors', name: 'Site visit',
    location: 'Sarabha Nagar, Ludhiana', state: 'upcoming',
    ideas: [
      { name: 'Modular kitchen reveal', concept: 'Slow walkthrough of the finished modular kitchen, morning light through the window.', script: 'Start wide on the full kitchen, then push in on the storage features and countertop finish.' },
      { name: 'Client testimonial — Mrs. Bedi', concept: 'Seated interview with Mrs. Bedi about her renovation experience.', script: 'Ask: what made you choose Sandhu Interiors? What surprised you most about the finished space?' },
    ],
  },
  {
    id: 'ramana-smile', date: [2026, 9, 25], start: 9, end: 10.5, client: 'Ramana Dental', name: 'Smile makeover shoot',
    location: 'Model Town, Ludhiana', state: 'upcoming',
    ideas: [
      { name: 'Smile makeover before/after', concept: 'Before/after footage of a recent smile makeover patient.', script: 'Symmetrical close-up shots of the smile, matched framing before and after.' },
      { name: 'Root canal myths', concept: 'Talking-head setup for a myths-vs-facts explainer.', script: 'Frame the doctor centre, clean background, room for lower-third captions.' },
      { name: 'New patient walk-in day', concept: 'Footage of the new patient welcome process.', script: 'Capture the check-in desk, a warm greeting, and the consult room handoff.' },
    ],
  },
  {
    id: 'basil-menu', date: [2026, 9, 26], start: 8, end: 9.5, client: 'Basil Café', name: 'New season menu',
    location: 'Sarabha Nagar, Ludhiana', state: 'upcoming',
    ideas: [
      { name: 'New season menu', concept: 'Overhead shots of the five new dishes as they get plated fresh.', script: 'Get close-up texture shots — steam, garnish, the pour. No talking, just visuals.' },
      { name: "Barista's pick", concept: 'Barista making their favourite drink from the new menu.', script: 'Ask the barista to talk through what makes this drink their pick while making it.' },
    ],
  },
]

/** Shoots whose raw footage has not been detected in Drive: drives the Pending uploads screen and the rail badge. */
export const pendingShoots = camShoots.filter((s) => s.state === 'raw-missing')
