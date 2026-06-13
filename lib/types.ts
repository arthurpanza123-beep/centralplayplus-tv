export type MediaType = 'movie' | 'series' | 'channel'

export interface CastMember {
  name: string
  role: string
}

export interface Movie {
  id: string
  title: string
  year: number
  duration: string
  genre: string
  rating: number
  quality: 'HD' | '4K' | 'SD'
  description: string
  cast: CastMember[]
  director: string
  colorFrom: string
  colorTo: string
  /** Pre-computed CSS gradient string — avoids template literal on every render */
  gradient?: string
  type: 'movie'
}

export interface Series {
  id: string
  title: string
  year: number
  seasons: number
  genre: string
  rating: number
  quality: 'HD' | '4K' | 'SD'
  description: string
  cast: CastMember[]
  creator: string
  colorFrom: string
  colorTo: string
  /** Pre-computed CSS gradient string — avoids template literal on every render */
  gradient?: string
  type: 'series'
}

export interface Program {
  time: string
  endTime: string
  title: string
  isLive?: boolean
}

export interface Channel {
  id: string
  number: number
  name: string
  category: string
  currentProgram: string
  programs: Program[]
  logoColor: string
  logoText: string
}

export interface WatchingItem {
  id: string
  title: string
  episode: string
  progress: number
  colorFrom: string
  colorTo: string
  isNew?: boolean
}

export interface KidsItem {
  id: string
  title: string
  colorFrom: string
  colorTo: string
}

export interface User {
  name: string
  email: string
  plan: string
  validity: string
  deviceCode: string
  notifications: boolean
  autoplay: boolean
  parentalControl: string
  language: string
  videoQuality: string
  connectedDevices: number
  appVersion: string
}

export type ContentItem = Movie | Series
