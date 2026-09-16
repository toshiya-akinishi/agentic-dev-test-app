/**
 * チケット券種・注文のデータ取得/更新フック（EP-07 / 要求 5-1, 5-3）。
 *
 * cms 側の `POST /api/ticket-orders/checkout`（決済 MOCK）と `GET /api/tickets/me`
 * （hub `docs/03-api-spec.md` 3章）はまだ実装されていない（EP-16 と並行中のため想定内のギャップ。
 * EP-05 認証エンドポイントと同じ扱い）。
 * `ticket-orders` コレクションの access は `create: authenticated` / `read,update: 自分の注文のみ（admin以外）`
 * になっている（cms `src/collections/TicketOrders.ts` で確認済み）ため、標準の Payload REST
 * （コレクション CRUD）を直接使うだけで 補-5-1-2 の要件を満たせる。
 * 決済処理自体（MOCK・常に成功）は `checkoutTicket` の1関数に隔離し、実決済への差し替え点を明確にする。
 */
import { useAtomValue } from 'jotai'
import { useMemo } from 'react'

import { createDoc } from '../api/client'
import { commaList } from '../features/common'
import {
  buildQrPayload,
  generateMockPaymentRef,
  generateOrderNo,
  isTicketTypeSaleable,
} from '../lib/tickets'
import { authUserAtom } from '../store/auth'
import { useApiMutation, useDoc, useList, useQueryClient } from './hooks'
import { qk } from './keys'
import type { TicketOrder, TicketType } from '../types/payload'

/* ---------------- 券種（5-1 / 補-5-1-3） ---------------- */

export const useTicketTypes = (tournamentId?: string) =>
  useList<TicketType>(
    qk.ticketTypes(tournamentId ?? ''),
    'ticket-types',
    { where: { tournament: { equals: tournamentId } }, sort: 'price', limit: 50, depth: 0 },
    { enabled: Boolean(tournamentId) },
  )

/**
 * 補-5-1-1: 大会一覧の「チケット販売中」バッジ判定。
 * 一覧に出ている全大会分をまとめて1回で取得し、購入可能な券種を持つ大会IDの集合を返す。
 */
export const useSaleableTicketTournamentIds = (tournamentIds: number[]) => {
  const ids = commaList(tournamentIds)
  const query = useList<TicketType>(
    qk.ticketTypesOnSale(ids),
    'ticket-types',
    { where: { tournament: { in: ids } }, limit: 300, depth: 0 },
    { enabled: tournamentIds.length > 0 },
  )

  return useMemo(() => {
    const set = new Set<number>()
    for (const t of query.data?.docs ?? []) {
      if (!isTicketTypeSaleable(t)) continue
      const tid = typeof t.tournament === 'number' ? t.tournament : t.tournament.id
      set.add(tid)
    }
    return set
  }, [query.data])
}

/* ---------------- 注文・電子チケット（5-1 / 5-3） ---------------- */

/** 5-3 / 補-5-3-1, 補-5-3-3: 自分のチケット注文一覧。ticketType -> tournament まで展開する */
export const useMyTicketOrders = () => {
  const user = useAtomValue(authUserAtom)
  return useList<TicketOrder>(
    qk.myTickets(),
    'ticket-orders',
    {
      where: user ? { user: { equals: user.id } } : undefined,
      sort: '-purchasedAt',
      limit: 100,
      depth: 2, // order -> ticketType -> tournament
    },
    { enabled: Boolean(user) },
  )
}

export const useTicketOrder = (id: string | undefined) =>
  useDoc<TicketOrder>(qk.ticket(id ?? ''), 'ticket-orders', id, 2)

/**
 * 補-5-1-2, 補-5-1-4: 決済 MOCK チェックアウト。
 * `POST /api/ticket-orders/checkout` の代わりに標準 REST `POST /api/ticket-orders` を叩き、
 * 常に成功する決済をクライアント側で模擬する。外部決済への差し替え時はこの mutationFn だけを置き換える。
 */
export const useCheckoutTicketMutation = () => {
  const user = useAtomValue(authUserAtom)
  const queryClient = useQueryClient()

  return useApiMutation(
    async (vars: { ticketType: TicketType; quantity: number }) => {
      if (!user) throw new Error('ログインが必要です')
      const orderNo = generateOrderNo()
      const res = await createDoc<TicketOrder>('ticket-orders', {
        orderNo,
        user: user.id,
        ticketType: vars.ticketType.id,
        quantity: vars.quantity,
        amount: vars.ticketType.price * vars.quantity,
        status: 'paid', // 補-5-1-4: MOCK 決済は常に成功する
        paymentRef: generateMockPaymentRef(),
        qrPayload: buildQrPayload(orderNo),
        purchasedAt: new Date().toISOString(),
      })
      return res.doc
    },
    { onSuccess: () => void queryClient.invalidateQueries({ queryKey: qk.myTickets() }) },
  )
}
