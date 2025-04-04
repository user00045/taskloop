
import { Database as SupabaseDatabase } from "@/integrations/supabase/types";

// Extend the existing Supabase Database type with our custom tables
export interface ExtendedDatabase {
  public: {
    Tables: {
      // Include existing tables from the base Database type
      messages: SupabaseDatabase['public']['Tables']['messages'];
      profiles: SupabaseDatabase['public']['Tables']['profiles'] & {
        Row: {
          requestor_rating: number;
          doer_rating: number;
        };
        Insert: {
          requestor_rating?: number;
          doer_rating?: number;
        };
        Update: {
          requestor_rating?: number;
          doer_rating?: number;
        };
      };
      tasks: SupabaseDatabase['public']['Tables']['tasks'] & {
        Row: {
          requestor_verification_code: string | null;
          doer_verification_code: string | null;
          is_requestor_verified: boolean;
          is_doer_verified: boolean;
        };
        Insert: {
          requestor_verification_code?: string | null;
          doer_verification_code?: string | null;
          is_requestor_verified?: boolean;
          is_doer_verified?: boolean;
        };
        Update: {
          requestor_verification_code?: string | null;
          doer_verification_code?: string | null;
          is_requestor_verified?: boolean;
          is_doer_verified?: boolean;
        };
      };
      
      // Add custom tables
      task_applications: {
        Row: {
          id: string;
          task_id: string;
          applicant_id: string;
          message: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          applicant_id: string;
          message: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          applicant_id?: string;
          message?: string;
          status?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_applications_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          }
        ];
      };
      
      chats: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user1_id: string;
          user2_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user1_id?: string;
          user2_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: SupabaseDatabase['public']['Views'];
    Functions: SupabaseDatabase['public']['Functions'];
    Enums: SupabaseDatabase['public']['Enums'];
    CompositeTypes: SupabaseDatabase['public']['CompositeTypes'];
  };
}
