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
      article_ratings: {
        Row: {
          article_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_ratings_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          points_awarded: number | null
          status: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          status?: Database["public"]["Enums"]["article_status"]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          points_awarded?: number | null
          status?: Database["public"]["Enums"]["article_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_role: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_role?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      deletion_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      guessing_games: {
        Row: {
          closed_at: string | null
          correct_answer: string | null
          created_at: string
          created_by: string
          id: string
          image_url: string | null
          points_awarded: number | null
          question: string
          status: Database["public"]["Enums"]["guessing_game_status"]
          title: string
          winner_id: string | null
        }
        Insert: {
          closed_at?: string | null
          correct_answer?: string | null
          created_at?: string
          created_by: string
          id?: string
          image_url?: string | null
          points_awarded?: number | null
          question: string
          status?: Database["public"]["Enums"]["guessing_game_status"]
          title: string
          winner_id?: string | null
        }
        Update: {
          closed_at?: string | null
          correct_answer?: string | null
          created_at?: string
          created_by?: string
          id?: string
          image_url?: string | null
          points_awarded?: number | null
          question?: string
          status?: Database["public"]["Enums"]["guessing_game_status"]
          title?: string
          winner_id?: string | null
        }
        Relationships: []
      }
      guessing_tips: {
        Row: {
          created_at: string
          game_id: string
          id: string
          is_winner: boolean | null
          tip: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          is_winner?: boolean | null
          tip: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          is_winner?: boolean | null
          tip?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guessing_tips_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "guessing_games"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          recipient_id: string
          sender_id: string | null
          subject: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id: string
          sender_id?: string | null
          subject: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          recipient_id?: string
          sender_id?: string | null
          subject?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          code_verifier: string
          created_at: string | null
          expires_at: string
          id: string
          state: string
          used_at: string | null
        }
        Insert: {
          code_verifier: string
          created_at?: string | null
          expires_at: string
          id?: string
          state: string
          used_at?: string | null
        }
        Update: {
          code_verifier?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          state?: string
          used_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          for_fun: boolean | null
          gender: string | null
          id: string
          points: number
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          for_fun?: boolean | null
          gender?: string | null
          id: string
          points?: number
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          for_fun?: boolean | null
          gender?: string | null
          id?: string
          points?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          item_id: string
          quantity: number
          status: string
          total_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          quantity?: number
          status?: string
          total_price: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          quantity?: number
          status?: string
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      season_reward_claims: {
        Row: {
          claimed_at: string
          id: string
          reward_id: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          id?: string
          reward_id: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          id?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_reward_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "season_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      season_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          required_correct_count: number
          reward_type: string
          reward_value: number
          season_id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          required_correct_count?: number
          reward_type?: string
          reward_value?: number
          season_id: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          required_correct_count?: number
          reward_type?: string
          reward_value?: number
          season_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_rewards_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      season_riddle_attempts: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_correct: boolean
          riddle_id: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_correct?: boolean
          riddle_id: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_correct?: boolean
          riddle_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_riddle_attempts_riddle_id_fkey"
            columns: ["riddle_id"]
            isOneToOne: false
            referencedRelation: "season_riddles"
            referencedColumns: ["id"]
          },
        ]
      }
      season_riddles: {
        Row: {
          answer: string
          created_at: string
          created_by: string
          hint: string | null
          id: string
          is_published: boolean
          question: string
          reward_discount_percent: number | null
          reward_item_id: string | null
          scheduled_date: string
          season_id: string
          title: string
        }
        Insert: {
          answer: string
          created_at?: string
          created_by: string
          hint?: string | null
          id?: string
          is_published?: boolean
          question: string
          reward_discount_percent?: number | null
          reward_item_id?: string | null
          scheduled_date: string
          season_id: string
          title: string
        }
        Update: {
          answer?: string
          created_at?: string
          created_by?: string
          hint?: string | null
          id?: string
          is_published?: boolean
          question?: string
          reward_discount_percent?: number | null
          reward_item_id?: string | null
          scheduled_date?: string
          season_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "season_riddles_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "season_riddles_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          is_visible: boolean
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          endpoint: string | null
          event_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          endpoint?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price: number
          stock: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price?: number
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: string
          id: string
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      spotlights: {
        Row: {
          color: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          link: string | null
          reference_id: string | null
          sort_order: number
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          reference_id?: string | null
          sort_order?: number
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          link?: string | null
          reference_id?: string | null
          sort_order?: number
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_changelog: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_changelog_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      purchase_item: {
        Args: { _item_id: string; _quantity?: number; _user_id: string }
        Returns: {
          message: string
          purchase_id: string
          success: boolean
        }[]
      }
      update_points: {
        Args: { _amount: number; _user_id: string }
        Returns: {
          new_points: number
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "user"
        | "helper"
        | "organizer"
        | "alik_admin"
        | "alik_helper"
        | "alik_editor"
        | "alik_club_manager"
        | "alik_board_manager"
        | "alik_jester"
      article_status:
        | "pending"
        | "approved"
        | "rejected"
        | "rated"
        | "published"
      guessing_game_status: "active" | "closed" | "resolved"
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
      app_role: [
        "user",
        "helper",
        "organizer",
        "alik_admin",
        "alik_helper",
        "alik_editor",
        "alik_club_manager",
        "alik_board_manager",
        "alik_jester",
      ],
      article_status: ["pending", "approved", "rejected", "rated", "published"],
      guessing_game_status: ["active", "closed", "resolved"],
    },
  },
} as const
