'use client'

import { publicEnv } from '@/lib/env.public'

export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

export const isStandalone = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)

export const isIos = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent)

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

/** Asks permission, subscribes this device and stores it. Returns a reason when it cannot. */
export async function subscribeThisDevice(): Promise<{ ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'failed' }> {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
  if (permission !== 'granted') return { ok: false, reason: 'denied' }
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = (await registration.pushManager.getSubscription())
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicEnv.vapidPublicKey) })
    const json = subscription.toJSON()
    const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }) })
    return response.ok ? { ok: true } : { ok: false, reason: 'failed' }
  } catch { return { ok: false, reason: 'failed' } }
}

export async function unsubscribeThisDevice() {
  if (!pushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => {})
  await subscription.unsubscribe().catch(() => {})
}

export async function thisDeviceSubscribed() {
  if (!pushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  return !!(await registration.pushManager.getSubscription())
}
