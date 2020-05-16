export interface SearchOptions {
    type?: "video" | "channel" | "playlist";
    limit?: number;
    page?: number;
}

export interface Video {
  id: string;
  title: string;
  duration: number|null;
  thumbnail: string;
  channel: Channel;
  uploadDate: string;
  viewCount: number|null;
}

export interface VideoDetailed {
  id: string;
  title: string;
  duration: number|null;
  description: string;
  channel: Channel;
  uploadDate: string;
  viewCount: number|null;
  likeCount: number|null;
  dislikeCount: number|null;
  tags: string[];
}

export interface Playlist {
  id: string;
  title: string;
  thumbnail: string;
  channel: Channel;
  videoCount: number;
}

export interface PlaylistDetailed {
  id: string;
  title: string;
  videoCount: number;
  viewCount: number;
  lastUpdatedAt: string;
  channel: Channel;
  videos: Video[];
}

export interface Channel {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  videoCount?: number;
}