'use client';

import { Play } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import MusicEmpty, { MusicRowListSkeleton } from '@/components/music/MusicEmpty';
import MusicPage from '@/components/music/MusicPage';
import SongList from '@/components/music/SongList';
import { MUSIC_BUTTON, MUSIC_COUNT } from '@/components/music/tokens';
import { playMusicList } from '@/lib/music/actions';
import { mapSong, musicSources, normalizeSource } from '@/lib/music/shared';
import type { Song } from '@/lib/music/types';

export default function MusicRankingDetailPage() {
  const params = useParams<{ source: string; playlistId: string }>();
  const searchParams = useSearchParams();
  const source = normalizeSource(params.source);
  const playlistId = decodeURIComponent(params.playlistId);
  const title = searchParams.get('name') || '排行榜';
  const [songs, setSongs] = useState<Song[]>([]);
  // 初值 true：进页就拉曲目，给 false 会先闪一帧"这个榜单是空的"再跳成骨架。
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/music/v2/discovery/board-songs?source=${source}&boardId=${encodeURIComponent(playlistId)}`)
      .then((res) => res.json())
      .then((data) => setSongs((data.data?.list || []).map(mapSong)))
      .catch(() => setSongs([]))
      .finally(() => setLoading(false));
  }, [source, playlistId]);

  const sourceLabel = musicSources.find((item) => item.key === source)?.label || source;

  return (
    <MusicPage
      title={title}
      subtitle={`榜单 · ${sourceLabel}`}
      actions={
        <>
          <span className={MUSIC_COUNT}>{songs.length} 首</span>
          <button
            type='button'
            onClick={() => playMusicList(songs, title)}
            disabled={songs.length === 0}
            className={MUSIC_BUTTON}
          >
            <Play className='h-3.5 w-3.5' strokeWidth={2.2} />
            播放全部
          </button>
        </>
      }
    >
      {loading ? (
        <MusicRowListSkeleton count={10} />
      ) : songs.length > 0 ? (
        <SongList songs={songs} />
      ) : (
        <MusicEmpty
          title='这个榜单是空的'
          hint='当前音源无法获取此榜单的曲目，回榜单页换一个试试。'
        />
      )}
    </MusicPage>
  );
}
