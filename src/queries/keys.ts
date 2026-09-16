/**
 * queryKey の一元管理（T-04-4 / docs/03-api-spec.md 4章）。
 * 画面側で文字列キーを直書きしない。
 */
export const qk = {
  appSettings: ['app-settings'] as const,

  seasons: () => ['seasons'] as const,

  tournaments: (params?: unknown) => ['tournaments', params ?? {}] as const,
  tournament: (id: string) => ['tournament', id] as const,
  rounds: (tournamentId: string) => ['rounds', tournamentId] as const,
  pairings: (roundId: string) => ['pairings', roundId] as const,

  leaderboard: (tournamentId: string, params?: unknown) =>
    ['leaderboard', tournamentId, params ?? {}] as const,
  compare: (tournamentId: string, playerIds: string[]) =>
    ['leaderboard-compare', tournamentId, [...playerIds].sort().join(',')] as const,
  playByPlay: (roundId: string, params?: unknown) =>
    ['play-by-play', roundId, params ?? {}] as const,
  shots: (params?: unknown) => ['shots', params ?? {}] as const,
  holeStatistics: (tournamentId: string, hole?: number) =>
    ['hole-statistics', tournamentId, hole ?? 'all'] as const,

  rankings: (seasonId: string, type: string) => ['rankings', seasonId, type] as const,

  players: (params?: unknown) => ['players', params ?? {}] as const,
  player: (id: string) => ['player', id] as const,
  playerStories: (playerId: string) => ['player-stories', playerId] as const,

  videos: (params?: unknown) => ['videos', params ?? {}] as const,
  video: (id: string) => ['video', id] as const,
  liveStreams: (tournamentId?: string) => ['live-streams', tournamentId ?? 'all'] as const,
  highlightsHome: () => ['highlights', 'home'] as const,
  highlightsForMe: (owner: string) => ['highlights', 'for-me', owner] as const,
  autoPlaylist: (roundId: string, playerId: string) =>
    ['playlists', 'auto', roundId, playerId] as const,
  playlists: (owner: string) => ['playlists', owner] as const,

  news: (params?: unknown) => ['news', params ?? {}] as const,
  newsItem: (id: string) => ['news-item', id] as const,
  guideArticles: (category?: string) => ['guide-articles', category ?? 'all'] as const,
  glossary: (q?: string) => ['glossary', q ?? ''] as const,
  faqs: () => ['faqs'] as const,
  onboardingSlides: () => ['onboarding-slides'] as const,
  legalDocuments: () => ['legal-documents'] as const,

  venues: () => ['venues'] as const,
  courses: (venueId: string) => ['courses', venueId] as const,
  holes: (courseId: string) => ['holes', courseId] as const,
  venueFacilities: (venueId: string, tournamentId?: string) =>
    ['venue-facilities', venueId, tournamentId ?? 'none'] as const,
  transportInfos: (tournamentId: string) => ['transport-infos', tournamentId] as const,
  weather: (tournamentId: string) => ['weather', tournamentId] as const,
  playerPositions: (tournamentId: string, playerIds: string[]) =>
    ['player-positions', tournamentId, [...playerIds].sort().join(',')] as const,

  favorites: (owner: string) => ['favorites', owner] as const,
  likes: (owner: string, kind: 'video' | 'shot') => ['likes', owner, kind] as const,
  notificationSettings: (owner: string) => ['notification-settings', owner] as const,
  notifications: (owner: string, params?: unknown) =>
    ['notifications', owner, params ?? {}] as const,

  ticketTypes: (tournamentId: string) => ['ticket-types', tournamentId] as const,
  myTickets: () => ['tickets', 'me'] as const,

  ad: (slot: string, ctx?: unknown) => ['ad', slot, ctx ?? {}] as const,

  me: () => ['me'] as const,

  /** 観戦ガイド記事詳細（1-1 / slug 引き） */
  guideArticle: (slug: string) => ['guide-article', slug] as const,
  /** 用語詳細（1-2 / 関連用語つき・補-1-2-2） */
  glossaryTerm: (id: string) => ['glossary-term', id] as const,
} as const

/**
 * オフライン永続化の対象にする queryKey の先頭要素（補-8-1-1）。
 * 大会情報 / 組み合わせ / コース / 会場マップ / 用語集 / 観戦ガイド / チケット / 通知センター。
 */
/**
 * ログアウト時にクリアする対象の queryKey 先頭要素（補-6-6-1）。
 * ユーザー固有データのみを対象にし、公開コンテンツのキャッシュ（大会/ニュース等）は残す。
 */
export const USER_SCOPED_KEY_ROOTS = new Set<string>([
  'me',
  'favorites',
  'likes',
  'notification-settings',
  'notifications',
  'playlists',
  'tickets',
])

export const PERSISTED_KEY_ROOTS = new Set<string>([
  'app-settings',
  'seasons',
  'tournaments',
  'tournament',
  'rounds',
  'pairings',
  'venues',
  'courses',
  'holes',
  'venue-facilities',
  'transport-infos',
  'glossary',
  'glossary-term',
  'guide-articles',
  'guide-article',
  'faqs',
  'tickets',
  'notifications',
  'favorites',
])
