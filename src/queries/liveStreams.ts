/**
 * ライブ配信（2-1, 2-2 / 補-2-1-1, 2 / 補-2-2-1〜3）。MOCK: 実配信基盤には接続せず
 * `streamUrl`（サンプル HLS/ローカル動画）で再生する。差し替えはこの値のみで完結する。
 */
import { useMemo } from 'react'

import { useDoc, useList } from './hooks'
import { qk } from './keys'
import type { LiveStream } from '../types/payload'

export const LIVE_KIND_LABELS: Record<LiveStream['kind'], string> = {
  practice_range: '練習場ライブ',
  instagram_live: 'インスタライブ',
  featured_group: '注目組 追っかけ配信',
}

/** 補-2-1-1: 遅延を「n分/n時間の追っかけ再生」表記にする */
export const formatDelay = (delaySec: number | null | undefined): string => {
  if (!delaySec || delaySec <= 0) return 'リアルタイム'
  if (delaySec < 60) return `約${delaySec}秒遅れ`
  const min = Math.round(delaySec / 60)
  if (min < 60) return `約${min}分遅れ`
  const hour = Math.round((min / 60) * 10) / 10
  return `約${hour}時間遅れ`
}

/** 配信中/配信予定を優先し、終了分は末尾にする */
const rank = (s: LiveStream): number => (s.status === 'live' ? 0 : s.status === 'scheduled' ? 1 : 2)

/** 補-2-2-2: 同時配信一覧。大会単位で全種別（練習場/インスタライブ/注目組）をまとめて返す */
export const useLiveStreams = (tournamentId?: string) => {
  const query = useList<LiveStream>(
    qk.liveStreams(tournamentId),
    'live-streams',
    {
      where: tournamentId ? { tournament: { equals: tournamentId } } : undefined,
      sort: '-startedAt',
      limit: 50,
      depth: 1,
    },
    { enabled: true },
  )
  const streams = useMemo(
    () => [...(query.data?.docs ?? [])].sort((a, b) => rank(a) - rank(b)),
    [query.data],
  )
  return { ...query, streams }
}

/** 補-2-1-2: `ended` になったら archiveVideo（kind=live_archive）へ自動的に切り替える */
export const useLiveStream = (id: string | undefined) =>
  useDoc<LiveStream>(qk.liveStream(id ?? ''), 'live-streams', id, 2) // -> archiveVideo/thumbnail, tournament
