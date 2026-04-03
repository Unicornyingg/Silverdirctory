export type MarketplaceUser = {
  id: string;
  email: string;
  role: "client" | "caregiver" | "admin";
  is_suspended: boolean;
  is_banned: boolean;
  moderation_note: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserModeration = {
  user_id: string;
  is_suspended: boolean;
  is_banned: boolean;
  moderation_note: string | null;
  moderated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientProfile = {
  id: string;
  user_id: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
};

export type CaregiverProfile = {
  id: string;
  user_id: string;
  full_name: string;
  service_category: "home_nursing" | "home_personal_care";
  service_categories: ("home_nursing" | "home_personal_care")[];
  bio: string;
  years_experience: number;
  credentials_summary: string;
  availability_summary: string;
  response_time_summary: string;
  minimum_shift_hours: number | null;
  last_active_at: string;
  hourly_rate: number;
  home_nursing_rate: number | null;
  home_personal_care_rate: number | null;
  location: string;
  care_specialties: string[];
  languages_spoken: string[];
  profile_photo_url: string;
  is_verified: boolean;
  is_boosted: boolean;
  boost_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VerificationDoc = {
  id: string;
  user_id: string;
  document_url: string;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type ChatThread = {
  id: string;
  client_user_id: string;
  caregiver_profile_id: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
};

export type ChatReport = {
  id: string;
  thread_id: string;
  reporter_user_id: string;
  reported_user_id: string;
  reason: "harassment" | "scam" | "agency_poaching" | "other";
  details: string | null;
  status: "open" | "dismissed" | "suspended" | "banned";
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: MarketplaceUser;
        Insert: {
          id: string;
          email: string;
          role?: "client" | "caregiver" | "admin";
          is_suspended?: boolean;
          is_banned?: boolean;
          moderation_note?: string | null;
          moderated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          email: string;
          role: "client" | "caregiver" | "admin";
          is_suspended: boolean;
          is_banned: boolean;
          moderation_note: string | null;
          moderated_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      user_moderation: {
        Row: UserModeration;
        Insert: {
          user_id: string;
          is_suspended?: boolean;
          is_banned?: boolean;
          moderation_note?: string | null;
          moderated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          is_suspended: boolean;
          is_banned: boolean;
          moderation_note: string | null;
          moderated_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      client_profiles: {
        Row: ClientProfile;
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          phone?: string | null;
          location?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          full_name: string;
          phone: string | null;
          location: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      profiles: {
        Row: CaregiverProfile;
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          service_category?: "home_nursing" | "home_personal_care";
          service_categories?: ("home_nursing" | "home_personal_care")[];
          bio?: string;
          years_experience?: number;
          credentials_summary?: string;
          availability_summary?: string;
          response_time_summary?: string;
          minimum_shift_hours?: number | null;
          last_active_at?: string;
          hourly_rate: number;
          home_nursing_rate?: number | null;
          home_personal_care_rate?: number | null;
          location: string;
          care_specialties?: string[];
          languages_spoken?: string[];
          profile_photo_url: string;
          is_verified?: boolean;
          is_boosted?: boolean;
          boost_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          full_name: string;
          service_category: "home_nursing" | "home_personal_care";
          service_categories: ("home_nursing" | "home_personal_care")[];
          bio: string;
          years_experience: number;
          credentials_summary: string;
          availability_summary: string;
          response_time_summary: string;
          minimum_shift_hours: number | null;
          last_active_at: string;
          hourly_rate: number;
          home_nursing_rate: number | null;
          home_personal_care_rate: number | null;
          location: string;
          care_specialties: string[];
          languages_spoken: string[];
          profile_photo_url: string;
          is_verified: boolean;
          is_boosted: boolean;
          boost_expires_at: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      verification_docs: {
        Row: VerificationDoc;
        Insert: {
          id?: string;
          user_id: string;
          document_url: string;
          status?: "pending" | "approved" | "rejected";
          review_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: Partial<{
          document_url: string;
          status: "pending" | "approved" | "rejected";
          review_notes: string | null;
          updated_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        }>;
        Relationships: [];
      };
      chat_threads: {
        Row: ChatThread;
        Insert: {
          id?: string;
          client_user_id: string;
          caregiver_profile_id: string;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          last_message_at: string | null;
          last_message_preview: string | null;
          updated_at: string;
        }>;
        Relationships: [];
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: {
          id?: string;
          thread_id: string;
          sender_user_id: string;
          body: string;
          created_at?: string;
        };
        Update: Partial<{
          body: string;
        }>;
        Relationships: [];
      };
      chat_reports: {
        Row: ChatReport;
        Insert: {
          id?: string;
          thread_id: string;
          reporter_user_id: string;
          reported_user_id: string;
          reason: "harassment" | "scam" | "agency_poaching" | "other";
          details?: string | null;
          status?: "open" | "dismissed" | "suspended" | "banned";
          resolution_notes?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: Partial<{
          status: "open" | "dismissed" | "suspended" | "banned";
          resolution_notes: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
