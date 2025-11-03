export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analysis_templates: {
        Row: {
          background_back_url: string | null
          background_front_url: string | null
          created_at: string
          id: string
          name: string
          room_id: string
          slots_json: string
          updated_at: string
          version: number
        }
        Insert: {
          background_back_url?: string | null
          background_front_url?: string | null
          created_at?: string
          id?: string
          name: string
          room_id: string
          slots_json: string
          updated_at?: string
          version?: number
        }
        Update: {
          background_back_url?: string | null
          background_front_url?: string | null
          created_at?: string
          id?: string
          name?: string
          room_id?: string
          slots_json?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "analysis_templates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          room_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          room_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavior_categories_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_items: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          label: string
          psychological_meaning: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          label: string
          psychological_meaning?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          label?: string
          psychological_meaning?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "behavior_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "behavior_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      game_ai_briefs: {
        Row: {
          created_at: string
          id: string
          max_tokens: number | null
          model: string
          output_schema: Json
          published_at: string | null
          room_id: string
          status: Database["public"]["Enums"]["template_status"]
          system_prompt: string
          temperature: number | null
          updated_at: string
          user_prompt_template: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          max_tokens?: number | null
          model?: string
          output_schema?: Json
          published_at?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["template_status"]
          system_prompt: string
          temperature?: number | null
          updated_at?: string
          user_prompt_template: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          max_tokens?: number | null
          model?: string
          output_schema?: Json
          published_at?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["template_status"]
          system_prompt?: string
          temperature?: number | null
          updated_at?: string
          user_prompt_template?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_ai_briefs_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          code: string
          created_at: string | null
          end_time: string | null
          id: string
          paused_at: string | null
          room_id: string
          start_time: string
          status: string
          time_limit_minutes: number
          total_game_time_ms: number | null
          total_paused_ms: number
        }
        Insert: {
          code: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          paused_at?: string | null
          room_id: string
          start_time?: string
          status?: string
          time_limit_minutes: number
          total_game_time_ms?: number | null
          total_paused_ms?: number
        }
        Update: {
          code?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          paused_at?: string | null
          room_id?: string
          start_time?: string
          status?: string
          time_limit_minutes?: number
          total_game_time_ms?: number | null
          total_paused_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      game_templates: {
        Row: {
          accent_color: string
          background_url: string | null
          created_at: string
          font_family: string
          id: string
          layout_definition: Json
          logo_url: string | null
          name: string
          placeholders_schema: Json
          published_at: string | null
          room_id: string
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
          version: number
        }
        Insert: {
          accent_color?: string
          background_url?: string | null
          created_at?: string
          font_family?: string
          id?: string
          layout_definition?: Json
          logo_url?: string | null
          name: string
          placeholders_schema?: Json
          published_at?: string | null
          room_id: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          accent_color?: string
          background_url?: string | null
          created_at?: string
          font_family?: string
          id?: string
          layout_definition?: Json
          logo_url?: string | null
          name?: string
          placeholders_schema?: Json
          published_at?: string | null
          room_id?: string
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_templates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      player_analyses: {
        Row: {
          ai_output_json: Json | null
          ai_version: number
          created_at: string
          id: string
          pdf_url: string | null
          player_id: string
          session_id: string
          template_version: number
          updated_at: string
        }
        Insert: {
          ai_output_json?: Json | null
          ai_version: number
          created_at?: string
          id?: string
          pdf_url?: string | null
          player_id: string
          session_id: string
          template_version: number
          updated_at?: string
        }
        Update: {
          ai_output_json?: Json | null
          ai_version?: number
          created_at?: string
          id?: string
          pdf_url?: string | null
          player_id?: string
          session_id?: string
          template_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_analyses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      player_observations: {
        Row: {
          checks: Json | null
          created_at: string | null
          id: string
          language: string
          notes: string | null
          player_id: string
          primary_role_id: string | null
          updated_at: string | null
        }
        Insert: {
          checks?: Json | null
          created_at?: string | null
          id?: string
          language?: string
          notes?: string | null
          player_id: string
          primary_role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          checks?: Json | null
          created_at?: string | null
          id?: string
          language?: string
          notes?: string | null
          player_id?: string
          primary_role_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_observations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_observations_primary_role_id_fkey"
            columns: ["primary_role_id"]
            isOneToOne: false
            referencedRelation: "role_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          band_color: string | null
          consent: boolean
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          last_name: string | null
          phone: string | null
          session_id: string
        }
        Insert: {
          band_color?: string | null
          consent?: boolean
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          session_id: string
        }
        Update: {
          band_color?: string | null
          consent?: boolean
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      role_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          room_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          room_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_templates_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          ai_brief: string | null
          band_colors: string[] | null
          behavior_lexicon: Json | null
          branch: string | null
          created_at: string | null
          description: string | null
          edit_code: string | null
          id: string
          name: string
          time_limit_minutes: number
          updated_at: string | null
        }
        Insert: {
          ai_brief?: string | null
          band_colors?: string[] | null
          behavior_lexicon?: Json | null
          branch?: string | null
          created_at?: string | null
          description?: string | null
          edit_code?: string | null
          id?: string
          name: string
          time_limit_minutes: number
          updated_at?: string | null
        }
        Update: {
          ai_brief?: string | null
          band_colors?: string[] | null
          behavior_lexicon?: Json | null
          branch?: string | null
          created_at?: string | null
          description?: string | null
          edit_code?: string | null
          id?: string
          name?: string
          time_limit_minutes?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "editor"
      template_status: "draft" | "published"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor"],
      template_status: ["draft", "published"],
    },
  },
} as const
