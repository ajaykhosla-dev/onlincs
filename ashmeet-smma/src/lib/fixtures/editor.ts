// Fixture data for the Editor screens (Rohit Bansal). Same canonical values as docs/context.md
// and the approved editor.html. Anchor date: 23 September 2026.

import type { ReviewComment } from './console-screens'

export type Urgency = 'today' | 'soon' | 'ok'

export type EditorTask = {
  key: string
  clientId: string
  idea: string
  clientName: string
  assignedBy: string
  assignedOn: string
  urgency: { label: string; level: Urgency }
  /** Deadline panel, e.g. "Today, 23 Sep" */
  deadline: string
  brief: { concept?: string; script?: string; instructions?: string; reference?: string }
}

export const editorTasks: EditorTask[] = [
  {
    key: 'menu', clientId: 'cl-5', idea: 'New season menu', clientName: 'Basil Café', assignedBy: 'Manreet Gill', assignedOn: '21 Sep',
    urgency: { label: 'Due today', level: 'today' }, deadline: 'Today, 23 Sep',
    brief: {
      concept: 'Fast-paced montage of the five new dishes, ending on the founder plating the signature item.',
      script: 'VO: "New season, new flavours." Cut to each dish on a 1-second beat, hold 2s on final plate.',
      instructions: 'Match cuts to the trending audio linked below. Keep captions punchy — max 4 words per card.',
      reference: 'Reference reel',
    },
  },
  {
    key: 'smile', clientId: 'cl-1', idea: 'Smile makeover before/after', clientName: 'Ramana Dental', assignedBy: 'Jaspreet Kaur', assignedOn: '22 Sep',
    urgency: { label: 'Due tomorrow', level: 'soon' }, deadline: 'Tomorrow, 24 Sep',
    brief: { concept: 'Before/after transformation reel' },
  },
  {
    key: 'kitchen', clientId: 'cl-3', idea: 'Modular kitchen reveal', clientName: 'Sandhu Interiors', assignedBy: 'Nikhil Sharma', assignedOn: '20 Sep',
    urgency: { label: '27 Sep', level: 'ok' }, deadline: '27 Sep',
    brief: { concept: 'Reveal of modular kitchen' },
  },
]

/** The one cut sent back for changes (Re do screen). */
export const redoTask = {
  idea: 'Diwali offer reel · cut 3',
  meta: 'Khanna Jewellers · previous cut v2 · 6 days since changes requested',
  oldInstructions: 'Showcase the Diwali collection with warm gold tones. End on the shop logo. 30 seconds, upbeat festive music.',
  newInstructions:
    "End on the diya shot instead of the logo — client feels it's more festive. Fix the music crossfade at 0:38 and move the offer text off the product at 0:11.",
  previousCut: 'Version 2 · uploaded 17 Sep',
  uploadLabel: 'Upload revised cut (v3)',
}

export const redoChangeRequests: ReviewComment[] = [
  { id: 'cr-1', range: '0:11–0:14', author: 'Nikhil Sharma', text: 'The offer text is covering the product shot here — push it down or shrink it.' },
  { id: 'cr-2', range: '0:38–0:41', author: 'Nikhil Sharma', text: 'Music drops out oddly on the cut. Can we crossfade instead?' },
  { id: 'cr-3', range: '1:02–1:07', author: 'Khanna Jewellers (client)', voice: { duration: '0:09', transcript: '"Can you end on the diya shot instead of the logo? Feels more festive to close on."' } },
]

/** Export spec stated on every upload area (docs/context.md). */
export const EXPORT_SPEC = 'H.264 MP4 · under 200MB · faststart'

export type LibraryFolder = { clientId: string; summary: string } | { clientId: string; empty: true; summary: string }

export const libraryFolders: LibraryFolder[] = [
  { clientId: 'cl-1', summary: '18 items · updated 2 days ago' },
  { clientId: 'cl-2', summary: '31 items · updated yesterday' },
  { clientId: 'cl-3', summary: '9 items · updated 5 days ago' },
  { clientId: 'cl-4', summary: '14 items · updated 6 days ago' },
  { clientId: 'cl-5', summary: '22 items · updated 3 days ago' },
  { clientId: 'cl-6', empty: true, summary: 'Nothing uploaded yet — onboarding' },
]
