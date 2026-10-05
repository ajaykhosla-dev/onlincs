import 'server-only'
import { NextResponse } from 'next/server'
import type { LinkState } from './client-link'

const STATUS: Record<Exclude<LinkState, 'active'>, number> = { invalid: 404, revoked: 410, expired: 410, responded: 409, locked: 423 }

/** Each non-active state is a distinct answer so the page can show a distinct message. */
export const stateResponse = (state: Exclude<LinkState, 'active'>) =>
  NextResponse.json({ state }, { status: STATUS[state], headers: { 'Cache-Control': 'no-store' } })
