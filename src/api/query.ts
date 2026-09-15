/**
 * Payload の REST クエリビルダ（T-04-3）。
 * 画面側で `where[x][equals]=...` のような生文字列を組み立てない。
 */
export type WhereOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_equal'
  | 'less_than'
  | 'less_than_equal'
  | 'like'
  | 'contains'
  | 'in'
  | 'not_in'
  | 'exists'

export type WhereClause = {
  [field: string]: Partial<Record<WhereOperator, unknown>>
}

export type WhereInput =
  | WhereClause
  | { and: WhereInput[] }
  | { or: WhereInput[] }

export type ListParams = {
  where?: WhereInput
  sort?: string
  limit?: number
  page?: number
  depth?: number
  select?: string[]
  draft?: boolean
  locale?: string
}

/** where オブジェクトを Payload が解釈する bracket 記法へ展開する */
const flattenWhere = (
  where: unknown,
  prefix: string,
  out: Array<[string, string]>,
): void => {
  if (where === null || where === undefined) return
  if (Array.isArray(where)) {
    where.forEach((item, i) => flattenWhere(item, `${prefix}[${i}]`, out))
    return
  }
  if (typeof where === 'object') {
    for (const [key, value] of Object.entries(where as Record<string, unknown>)) {
      flattenWhere(value, `${prefix}[${key}]`, out)
    }
    return
  }
  out.push([prefix, String(where)])
}

export const buildQueryString = (params: ListParams = {}): string => {
  const parts: Array<[string, string]> = []

  if (params.where) flattenWhere(params.where, 'where', parts)
  if (params.sort) parts.push(['sort', params.sort])
  if (params.limit !== undefined) parts.push(['limit', String(params.limit)])
  if (params.page !== undefined) parts.push(['page', String(params.page)])
  if (params.depth !== undefined) parts.push(['depth', String(params.depth)])
  if (params.draft !== undefined) parts.push(['draft', String(params.draft)])
  if (params.locale) parts.push(['locale', params.locale])
  if (params.select?.length) {
    for (const f of params.select) parts.push([`select[${f}]`, 'true'])
  }

  if (!parts.length) return ''
  return (
    '?' +
    parts
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&')
  )
}

/** 複数条件を and でまとめる。undefined は無視する（フィルタ未指定を素直に書けるように） */
export const and = (...clauses: Array<WhereInput | undefined | false>): WhereInput | undefined => {
  const list = clauses.filter(Boolean) as WhereInput[]
  if (!list.length) return undefined
  if (list.length === 1) return list[0]
  return { and: list }
}

export const or = (...clauses: Array<WhereInput | undefined | false>): WhereInput | undefined => {
  const list = clauses.filter(Boolean) as WhereInput[]
  if (!list.length) return undefined
  if (list.length === 1) return list[0]
  return { or: list }
}
