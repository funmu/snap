export interface NoteAuthor {
  name: string;
  handle: string;
}

export interface NoteContent {
  raw: string;
  body: string;
  hashtags: string[];
}

export interface QuotedNote {
  author_name: string;
  author_handle: string;
  content: string;
  url?: string;
}

export interface NoteMetrics {
  likes?: number;
  restacks?: number;
  replies?: number;
  views?: number;
  last_updated?: string;
}

export type NoteStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

export interface NoteItem {
  id: string;
  url: string;
  author: NoteAuthor;
  content: NoteContent;
  is_restack: boolean;
  quoted_note?: QuotedNote;
  topic_cluster?: string;
  metrics?: NoteMetrics;
  status: NoteStatus;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface TopicCluster {
  id: string;
  title: string;
  keywords: string[];
  note_ids: string[];
  future_post_ideas: string[];
}

export interface SNAPDatabase {
  version: string;
  last_updated: string;
  notes: NoteItem[];
  clusters: TopicCluster[];
}
