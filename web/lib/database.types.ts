export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      devices: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          role: "sender" | "receiver";
          secret: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name?: string | null;
          role: "sender" | "receiver";
          secret: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          role?: "sender" | "receiver";
          secret?: string;
          created_at?: string;
        };
      };
      pairs: {
        Row: {
          id: string;
          user_id: string;
          sender_id: string;
          receiver_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          sender_id: string;
          receiver_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sender_id?: string;
          receiver_id?: string;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: number;
          pair_id: string;
          triggered_at: string;
        };
        Insert: {
          id?: number;
          pair_id: string;
          triggered_at?: string;
        };
        Update: {
          id?: number;
          pair_id?: string;
          triggered_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
