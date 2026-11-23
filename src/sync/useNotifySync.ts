/**
 * 課題・通知の設定が変わったら、2秒待ってから /api/sync に送る。
 * 送れなかったら「最後に送れた内容」が古いままなので、次の変更のときかアプリを開いたときにまた送る。
 * 通知をオンにしていない端末は何も送らない（サーバーにデータを置かない）。
 */
import { useEffect, useMemo } from 'react'
import type { Task } from '../types'
import { syncRemote } from './api'
import { checkOnOpen } from './notify'
import { buildSyncBody } from './payload'
import { setPushState, usePushState } from './pushState'

export const SYNC_DEBOUNCE_MS = 2000

export function useNotifySync(tasks: readonly Task[]): void {
  const { enabled, deviceId, secret, prefs, synced } = usePushState()
  const body = useMemo(() => buildSyncBody(tasks, prefs), [tasks, prefs])
  const snapshot = useMemo(() => JSON.stringify(body), [body])

  // 開いたときに1回だけ点検する
  useEffect(() => {
    void checkOnOpen()
  }, [])

  useEffect(() => {
    if (!enabled || !deviceId || !secret || snapshot === synced) return
    const timer = window.setTimeout(async () => {
      const r = await syncRemote({ deviceId, secret }, body)
      if (r.ok) setPushState({ synced: snapshot })
      // 401：サーバーに端末がない。もう一度オンにしてもらう
      else if (r.status === 401) setPushState({ enabled: false, synced: null, lost: true })
    }, SYNC_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, deviceId, secret, snapshot, synced, body])
}
