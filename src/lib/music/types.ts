export type MusicSource = 'wy' | 'tx' | 'kw' | 'kg' | 'mg';

export type MusicQuality = '128k' | '320k' | 'flac' | 'flac24bit';

export interface Song {
  id: string;
  name: string;
  artist: string;
  album?: string;
  pic?: string;
  platform: MusicSource;
  duration?: number;
  durationText?: string;
  songmid?: string;
}

export interface Playlist {
  id: string;
  name: string;
  pic?: string;
  /** 榜单接口回的封面字段名和歌单不一样（cover / pic），两个都留着。 */
  cover?: string;
  source?: MusicSource;
  updateFrequency?: string;
}
