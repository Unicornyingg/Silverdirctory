export type NurseProfile = {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  location: string;
  bio: string;
  hourly_rate: number;
  profile_photo_url: string;
  license_photo_url: string;
  verified: boolean;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      nurse_profiles: {
        Row: NurseProfile;
        Insert: {
          id: string;
          full_name: string;
          role?: string;
          phone?: string | null;
          location: string;
          bio: string;
          hourly_rate: number;
          profile_photo_url: string;
          license_photo_url: string;
          verified?: boolean;
          contact_email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          full_name: string;
          role: string;
          phone: string | null;
          location: string;
          bio: string;
          hourly_rate: number;
          profile_photo_url: string;
          license_photo_url: string;
          verified: boolean;
          contact_email: string | null;
          updated_at: string;
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
