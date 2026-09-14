export type SyncStatus = "running" | "success" | "partial" | "failed";

export type ChannelRow = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  category: string | null;
  active: boolean;
  upstream_created_at: string | null;
  last_seen_at: string;
  updated_at: string;
  created_at: string;
};

export type ChannelEmbedRow = {
  id: number;
  channel_id: string;
  provider: string;
  quality: string | null;
  embed_url: string;
  position: number;
  active: boolean;
  last_seen_at: string;
  updated_at: string;
  created_at: string;
};

export type ChannelEpgRow = {
  channel_id: string;
  current_title: string | null;
  current_description: string | null;
  current_formatted_time: string | null;
  current_start_time: string | null;
  current_end_time: string | null;
  current_image: string | null;
  next_title: string | null;
  next_description: string | null;
  next_formatted_time: string | null;
  next_start_time: string | null;
  next_end_time: string | null;
  next_image: string | null;
  upstream_timestamp: number | null;
  synced_at: string;
};

export type SyncLogRow = {
  id: number;
  sync_type: string;
  status: SyncStatus;
  started_at: string;
  finished_at: string | null;
  records_received: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  upstream_status: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type AppSettingRow = {
  key: string;
  value: unknown;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      channels: {
        Row: ChannelRow;
        Insert: Partial<ChannelRow> & Pick<ChannelRow, "id" | "name">;
        Update: Partial<ChannelRow>;
        Relationships: [];
      };
      channel_embeds: {
        Row: ChannelEmbedRow;
        Insert: Partial<ChannelEmbedRow> &
          Pick<ChannelEmbedRow, "channel_id" | "provider" | "embed_url">;
        Update: Partial<ChannelEmbedRow>;
        Relationships: [];
      };
      channel_epg: {
        Row: ChannelEpgRow;
        Insert: Partial<ChannelEpgRow> & Pick<ChannelEpgRow, "channel_id">;
        Update: Partial<ChannelEpgRow>;
        Relationships: [];
      };
      sync_logs: {
        Row: SyncLogRow;
        Insert: Partial<SyncLogRow> &
          Pick<SyncLogRow, "sync_type" | "status" | "started_at">;
        Update: Partial<SyncLogRow>;
        Relationships: [];
      };
      app_settings: {
        Row: AppSettingRow;
        Insert: Pick<AppSettingRow, "key" | "value"> & Partial<AppSettingRow>;
        Update: Partial<AppSettingRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      try_acquire_sync_lock: {
        Args: { p_sync_type: string };
        Returns: boolean;
      };
      release_sync_lock: {
        Args: { p_sync_type: string };
        Returns: boolean;
      };
    };
  };
};
