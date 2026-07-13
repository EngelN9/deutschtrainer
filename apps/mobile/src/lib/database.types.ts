export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      activities: {
        Row: {
          content_json: Json;
          created_at: string;
          deleted_at: string | null;
          id: string;
          lesson_id: string;
          order_index: number;
          status: Database["public"]["Enums"]["content_status"];
          title_zh_tw: string;
          type: Database["public"]["Enums"]["activity_type"];
          updated_at: string;
          version: number;
        };
        Insert: {
          content_json?: Json;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          lesson_id: string;
          order_index: number;
          status?: Database["public"]["Enums"]["content_status"];
          title_zh_tw: string;
          type: Database["public"]["Enums"]["activity_type"];
          updated_at?: string;
          version?: number;
        };
        Update: {
          content_json?: Json;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          lesson_id?: string;
          order_index?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title_zh_tw?: string;
          type?: Database["public"]["Enums"]["activity_type"];
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "activities_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_feedback: {
        Row: {
          attempt_id: string | null;
          cache_key: string;
          cached_from_id: string | null;
          created_at: string;
          feature: string;
          feedback_json: Json;
          id: string;
          idempotency_key: string;
          model: string;
          prompt_id: string;
          prompt_version: string;
          requires_human_review: boolean;
          schema_version: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Insert: {
          attempt_id?: string | null;
          cache_key: string;
          cached_from_id?: string | null;
          created_at?: string;
          feature: string;
          feedback_json: Json;
          id?: string;
          idempotency_key: string;
          model: string;
          prompt_id: string;
          prompt_version: string;
          requires_human_review?: boolean;
          schema_version: string;
          target_id: string;
          target_type: string;
          user_id: string;
        };
        Update: {
          attempt_id?: string | null;
          cache_key?: string;
          cached_from_id?: string | null;
          created_at?: string;
          feature?: string;
          feedback_json?: Json;
          id?: string;
          idempotency_key?: string;
          model?: string;
          prompt_id?: string;
          prompt_version?: string;
          requires_human_review?: boolean;
          schema_version?: string;
          target_id?: string;
          target_type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_feedback_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: true;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_feedback_cached_from_id_fkey";
            columns: ["cached_from_id"];
            isOneToOne: false;
            referencedRelation: "ai_feedback";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_feedback_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_usage_logs: {
        Row: {
          cached: boolean;
          created_at: string;
          error_code: string | null;
          estimated_cost: number;
          feature: string;
          id: string;
          idempotency_key: string;
          input_tokens: number;
          latency_ms: number;
          logical_request: boolean;
          model: string;
          output_tokens: number;
          provider_attempt: number;
          provider_request_id: string | null;
          request_id: string;
          success: boolean;
          user_id: string;
        };
        Insert: {
          cached?: boolean;
          created_at?: string;
          error_code?: string | null;
          estimated_cost?: number;
          feature: string;
          id?: string;
          idempotency_key: string;
          input_tokens?: number;
          latency_ms?: number;
          logical_request?: boolean;
          model: string;
          output_tokens?: number;
          provider_attempt: number;
          provider_request_id?: string | null;
          request_id: string;
          success: boolean;
          user_id: string;
        };
        Update: {
          cached?: boolean;
          created_at?: string;
          error_code?: string | null;
          estimated_cost?: number;
          feature?: string;
          id?: string;
          idempotency_key?: string;
          input_tokens?: number;
          latency_ms?: number;
          logical_request?: boolean;
          model?: string;
          output_tokens?: number;
          provider_attempt?: number;
          provider_request_id?: string | null;
          request_id?: string;
          success?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      attempt_answers: {
        Row: {
          answer_json: Json;
          attempt_id: string;
          created_at: string;
          exercise_id: string;
          grading_result_json: Json;
          id: string;
          normalized_answer_json: Json;
        };
        Insert: {
          answer_json: Json;
          attempt_id: string;
          created_at?: string;
          exercise_id: string;
          grading_result_json: Json;
          id?: string;
          normalized_answer_json: Json;
        };
        Update: {
          answer_json?: Json;
          attempt_id?: string;
          created_at?: string;
          exercise_id?: string;
          grading_result_json?: Json;
          id?: string;
          normalized_answer_json?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "attempt_answers_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: true;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempt_answers_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      attempts: {
        Row: {
          created_at: string;
          duration_ms: number;
          exercise_id: string;
          id: string;
          idempotency_key: string;
          is_correct: boolean;
          lesson_id: string;
          mode: Database["public"]["Enums"]["attempt_mode"];
          score: number;
          submitted_at: string;
          used_hint: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          duration_ms: number;
          exercise_id: string;
          id?: string;
          idempotency_key: string;
          is_correct: boolean;
          lesson_id: string;
          mode?: Database["public"]["Enums"]["attempt_mode"];
          score: number;
          submitted_at?: string;
          used_hint?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          duration_ms?: number;
          exercise_id?: string;
          id?: string;
          idempotency_key?: string;
          is_correct?: boolean;
          lesson_id?: string;
          mode?: Database["public"]["Enums"]["attempt_mode"];
          score?: number;
          submitted_at?: string;
          used_hint?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attempts_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attempts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          ip_hash: string | null;
          metadata_json: Json;
          user_agent_hash: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          ip_hash?: string | null;
          metadata_json?: Json;
          user_agent_hash?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          ip_hash?: string | null;
          metadata_json?: Json;
          user_agent_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          description_zh_tw: string;
          id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          published_at: string | null;
          status: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          description_zh_tw: string;
          id?: string;
          level: Database["public"]["Enums"]["cefr_level"];
          published_at?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          description_zh_tw?: string;
          id?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          published_at?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          title_de?: string;
          title_zh_tw?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      error_records: {
        Row: {
          attempt_id: string;
          correction: string;
          created_at: string;
          exercise_id: string;
          explanation_zh_tw: string;
          grammar_topic_id: string | null;
          id: string;
          lesson_id: string;
          original: string;
          severity: Database["public"]["Enums"]["error_severity"];
          skill_id: string;
          type: Database["public"]["Enums"]["error_type"];
          user_id: string;
          vocabulary_id: string | null;
        };
        Insert: {
          attempt_id: string;
          correction: string;
          created_at?: string;
          exercise_id: string;
          explanation_zh_tw: string;
          grammar_topic_id?: string | null;
          id?: string;
          lesson_id: string;
          original: string;
          severity: Database["public"]["Enums"]["error_severity"];
          skill_id: string;
          type?: Database["public"]["Enums"]["error_type"];
          user_id: string;
          vocabulary_id?: string | null;
        };
        Update: {
          attempt_id?: string;
          correction?: string;
          created_at?: string;
          exercise_id?: string;
          explanation_zh_tw?: string;
          grammar_topic_id?: string | null;
          id?: string;
          lesson_id?: string;
          original?: string;
          severity?: Database["public"]["Enums"]["error_severity"];
          skill_id?: string;
          type?: Database["public"]["Enums"]["error_type"];
          user_id?: string;
          vocabulary_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "error_records_attempt_id_fkey";
            columns: ["attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_records_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_records_grammar_topic_id_fkey";
            columns: ["grammar_topic_id"];
            isOneToOne: false;
            referencedRelation: "grammar_topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_records_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_records_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_records_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "error_records_vocabulary_id_fkey";
            columns: ["vocabulary_id"];
            isOneToOne: false;
            referencedRelation: "vocabulary";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_answers: {
        Row: {
          answer_json: Json;
          created_at: string;
          exercise_id: string;
          explanation_zh_tw: string;
          grading_policy_json: Json;
          id: string;
          updated_at: string;
        };
        Insert: {
          answer_json: Json;
          created_at?: string;
          exercise_id: string;
          explanation_zh_tw?: string;
          grading_policy_json?: Json;
          id?: string;
          updated_at?: string;
        };
        Update: {
          answer_json?: Json;
          created_at?: string;
          exercise_id?: string;
          explanation_zh_tw?: string;
          grading_policy_json?: Json;
          id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_answers_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: true;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercise_options: {
        Row: {
          created_at: string;
          exercise_id: string;
          id: string;
          is_correct: boolean;
          label: string;
          metadata_json: Json;
          order_index: number;
          text_de: string;
          text_zh_tw: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          exercise_id: string;
          id?: string;
          is_correct?: boolean;
          label: string;
          metadata_json?: Json;
          order_index: number;
          text_de: string;
          text_zh_tw?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          exercise_id?: string;
          id?: string;
          is_correct?: boolean;
          label?: string;
          metadata_json?: Json;
          order_index?: number;
          text_de?: string;
          text_zh_tw?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exercise_options_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
        ];
      };
      exercises: {
        Row: {
          activity_id: string;
          created_at: string;
          deleted_at: string | null;
          difficulty: number;
          estimated_seconds: number;
          grammar_topic_ids: string[];
          id: string;
          instruction_zh_tw: string;
          level: Database["public"]["Enums"]["cefr_level"];
          order_index: number;
          payload_json: Json;
          prompt_de: string;
          review_status: Database["public"]["Enums"]["review_status"];
          skill_ids: string[];
          source_type: Database["public"]["Enums"]["source_type"];
          status: Database["public"]["Enums"]["content_status"];
          title: string;
          type: Database["public"]["Enums"]["exercise_type"];
          updated_at: string;
          version: number;
          vocabulary_ids: string[];
        };
        Insert: {
          activity_id: string;
          created_at?: string;
          deleted_at?: string | null;
          difficulty: number;
          estimated_seconds: number;
          grammar_topic_ids?: string[];
          id?: string;
          instruction_zh_tw: string;
          level: Database["public"]["Enums"]["cefr_level"];
          order_index: number;
          payload_json?: Json;
          prompt_de: string;
          review_status?: Database["public"]["Enums"]["review_status"];
          skill_ids?: string[];
          source_type?: Database["public"]["Enums"]["source_type"];
          status?: Database["public"]["Enums"]["content_status"];
          title: string;
          type: Database["public"]["Enums"]["exercise_type"];
          updated_at?: string;
          version?: number;
          vocabulary_ids?: string[];
        };
        Update: {
          activity_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          difficulty?: number;
          estimated_seconds?: number;
          grammar_topic_ids?: string[];
          id?: string;
          instruction_zh_tw?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          order_index?: number;
          payload_json?: Json;
          prompt_de?: string;
          review_status?: Database["public"]["Enums"]["review_status"];
          skill_ids?: string[];
          source_type?: Database["public"]["Enums"]["source_type"];
          status?: Database["public"]["Enums"]["content_status"];
          title?: string;
          type?: Database["public"]["Enums"]["exercise_type"];
          updated_at?: string;
          version?: number;
          vocabulary_ids?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "exercises_activity_id_fkey";
            columns: ["activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          audience_json: Json;
          created_at: string;
          description: string;
          enabled: boolean;
          id: string;
          key: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          audience_json?: Json;
          created_at?: string;
          description?: string;
          enabled?: boolean;
          id?: string;
          key: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          audience_json?: Json;
          created_at?: string;
          description?: string;
          enabled?: boolean;
          id?: string;
          key?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      grammar_topics: {
        Row: {
          code: string;
          common_mistakes_json: Json;
          created_at: string;
          difficulty: number;
          examples_json: Json;
          full_explanation_zh_tw: string;
          id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          prerequisite_topic_ids: string[];
          related_skill_ids: string[];
          rules_json: Json;
          short_explanation_zh_tw: string;
          status: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          code: string;
          common_mistakes_json?: Json;
          created_at?: string;
          difficulty: number;
          examples_json?: Json;
          full_explanation_zh_tw: string;
          id?: string;
          level: Database["public"]["Enums"]["cefr_level"];
          prerequisite_topic_ids?: string[];
          related_skill_ids?: string[];
          rules_json?: Json;
          short_explanation_zh_tw: string;
          status?: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          code?: string;
          common_mistakes_json?: Json;
          created_at?: string;
          difficulty?: number;
          examples_json?: Json;
          full_explanation_zh_tw?: string;
          id?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          prerequisite_topic_ids?: string[];
          related_skill_ids?: string[];
          rules_json?: Json;
          short_explanation_zh_tw?: string;
          status?: Database["public"]["Enums"]["content_status"];
          title_de?: string;
          title_zh_tw?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          attempted_exercise_count: number;
          completed_at: string | null;
          completed_exercise_ids: string[];
          completion_percent: number;
          correct_exercise_count: number;
          created_at: string;
          id: string;
          last_activity_id: string | null;
          last_practiced_at: string | null;
          lesson_id: string;
          status: Database["public"]["Enums"]["lesson_progress_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempted_exercise_count?: number;
          completed_at?: string | null;
          completed_exercise_ids?: string[];
          completion_percent?: number;
          correct_exercise_count?: number;
          created_at?: string;
          id?: string;
          last_activity_id?: string | null;
          last_practiced_at?: string | null;
          lesson_id: string;
          status?: Database["public"]["Enums"]["lesson_progress_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempted_exercise_count?: number;
          completed_at?: string | null;
          completed_exercise_ids?: string[];
          completion_percent?: number;
          correct_exercise_count?: number;
          created_at?: string;
          id?: string;
          last_activity_id?: string | null;
          last_practiced_at?: string | null;
          lesson_id?: string;
          status?: Database["public"]["Enums"]["lesson_progress_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_last_activity_id_fkey";
            columns: ["last_activity_id"];
            isOneToOne: false;
            referencedRelation: "activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lessons: {
        Row: {
          cefr_descriptor: string;
          created_at: string;
          deleted_at: string | null;
          estimated_minutes: number;
          grammar_tags: string[];
          id: string;
          learning_objectives: string[];
          level: Database["public"]["Enums"]["cefr_level"];
          order_index: number;
          prerequisite_skill_ids: string[];
          skill_categories: Database["public"]["Enums"]["skill_category"][];
          status: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          unit_id: string;
          updated_at: string;
          version: number;
          vocabulary_tags: string[];
        };
        Insert: {
          cefr_descriptor: string;
          created_at?: string;
          deleted_at?: string | null;
          estimated_minutes: number;
          grammar_tags?: string[];
          id?: string;
          learning_objectives: string[];
          level: Database["public"]["Enums"]["cefr_level"];
          order_index: number;
          prerequisite_skill_ids?: string[];
          skill_categories?: Database["public"]["Enums"]["skill_category"][];
          status?: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          unit_id: string;
          updated_at?: string;
          version?: number;
          vocabulary_tags?: string[];
        };
        Update: {
          cefr_descriptor?: string;
          created_at?: string;
          deleted_at?: string | null;
          estimated_minutes?: number;
          grammar_tags?: string[];
          id?: string;
          learning_objectives?: string[];
          level?: Database["public"]["Enums"]["cefr_level"];
          order_index?: number;
          prerequisite_skill_ids?: string[];
          skill_categories?: Database["public"]["Enums"]["skill_category"][];
          status?: Database["public"]["Enums"]["content_status"];
          title_de?: string;
          title_zh_tw?: string;
          unit_id?: string;
          updated_at?: string;
          version?: number;
          vocabulary_tags?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "lessons_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          auth_user_id: string;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          id: string;
          onboarding_completed: boolean;
          role: Database["public"]["Enums"]["app_role"];
          timezone: string;
          updated_at: string;
        };
        Insert: {
          auth_user_id: string;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          id?: string;
          onboarding_completed?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          timezone?: string;
          updated_at?: string;
        };
        Update: {
          auth_user_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          id?: string;
          onboarding_completed?: boolean;
          role?: Database["public"]["Enums"]["app_role"];
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      review_queue: {
        Row: {
          completed_at: string | null;
          completed_attempt_id: string | null;
          created_at: string;
          ease_factor: number;
          exercise_id: string;
          id: string;
          interval_days: number;
          priority: number;
          reason: string;
          scheduled_at: string;
          skill_id: string;
          source_attempt_id: string;
          status: Database["public"]["Enums"]["review_queue_status"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          completed_attempt_id?: string | null;
          created_at?: string;
          ease_factor?: number;
          exercise_id: string;
          id?: string;
          interval_days: number;
          priority: number;
          reason: string;
          scheduled_at: string;
          skill_id: string;
          source_attempt_id: string;
          status?: Database["public"]["Enums"]["review_queue_status"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          completed_attempt_id?: string | null;
          created_at?: string;
          ease_factor?: number;
          exercise_id?: string;
          id?: string;
          interval_days?: number;
          priority?: number;
          reason?: string;
          scheduled_at?: string;
          skill_id?: string;
          source_attempt_id?: string;
          status?: Database["public"]["Enums"]["review_queue_status"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_queue_completed_attempt_id_fkey";
            columns: ["completed_attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_queue_exercise_id_fkey";
            columns: ["exercise_id"];
            isOneToOne: false;
            referencedRelation: "exercises";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_queue_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_queue_source_attempt_id_fkey";
            columns: ["source_attempt_id"];
            isOneToOne: false;
            referencedRelation: "attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_queue_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      skill_mastery: {
        Row: {
          attempt_count: number;
          average_response_time_ms: number;
          confidence_score: number;
          correct_count: number;
          correct_streak: number;
          created_at: string;
          hint_count: number;
          id: string;
          incorrect_count: number;
          incorrect_streak: number;
          last_error_types: Database["public"]["Enums"]["error_type"][];
          last_practiced_at: string | null;
          mastery_score: number;
          next_review_at: string | null;
          skill_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          attempt_count?: number;
          average_response_time_ms?: number;
          confidence_score?: number;
          correct_count?: number;
          correct_streak?: number;
          created_at?: string;
          hint_count?: number;
          id?: string;
          incorrect_count?: number;
          incorrect_streak?: number;
          last_error_types?: Database["public"]["Enums"]["error_type"][];
          last_practiced_at?: string | null;
          mastery_score?: number;
          next_review_at?: string | null;
          skill_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          attempt_count?: number;
          average_response_time_ms?: number;
          confidence_score?: number;
          correct_count?: number;
          correct_streak?: number;
          created_at?: string;
          hint_count?: number;
          id?: string;
          incorrect_count?: number;
          incorrect_streak?: number;
          last_error_types?: Database["public"]["Enums"]["error_type"][];
          last_practiced_at?: string | null;
          mastery_score?: number;
          next_review_at?: string | null;
          skill_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "skill_mastery_skill_id_fkey";
            columns: ["skill_id"];
            isOneToOne: false;
            referencedRelation: "skills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "skill_mastery_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      skills: {
        Row: {
          category: Database["public"]["Enums"]["skill_category"];
          code: string;
          created_at: string;
          description_zh_tw: string;
          id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          mastery_threshold: number;
          name_de: string;
          name_zh_tw: string;
          prerequisite_skill_ids: string[];
          review_policy_json: Json;
          status: Database["public"]["Enums"]["content_status"];
          updated_at: string;
        };
        Insert: {
          category: Database["public"]["Enums"]["skill_category"];
          code: string;
          created_at?: string;
          description_zh_tw: string;
          id?: string;
          level: Database["public"]["Enums"]["cefr_level"];
          mastery_threshold?: number;
          name_de: string;
          name_zh_tw: string;
          prerequisite_skill_ids?: string[];
          review_policy_json?: Json;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["skill_category"];
          code?: string;
          created_at?: string;
          description_zh_tw?: string;
          id?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          mastery_threshold?: number;
          name_de?: string;
          name_zh_tw?: string;
          prerequisite_skill_ids?: string[];
          review_policy_json?: Json;
          status?: Database["public"]["Enums"]["content_status"];
          updated_at?: string;
        };
        Relationships: [];
      };
      units: {
        Row: {
          course_id: string;
          created_at: string;
          deleted_at: string | null;
          description_zh_tw: string;
          id: string;
          order_index: number;
          status: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          deleted_at?: string | null;
          description_zh_tw?: string;
          id?: string;
          order_index: number;
          status?: Database["public"]["Enums"]["content_status"];
          title_de: string;
          title_zh_tw: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          deleted_at?: string | null;
          description_zh_tw?: string;
          id?: string;
          order_index?: number;
          status?: Database["public"]["Enums"]["content_status"];
          title_de?: string;
          title_zh_tw?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "units_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_levels: {
        Row: {
          created_at: string;
          current_level: Database["public"]["Enums"]["cefr_level"];
          id: string;
          placement_result_json: Json;
          placement_status: string;
          target_level: Database["public"]["Enums"]["cefr_level"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_level?: Database["public"]["Enums"]["cefr_level"];
          id?: string;
          placement_result_json?: Json;
          placement_status?: string;
          target_level?: Database["public"]["Enums"]["cefr_level"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_level?: Database["public"]["Enums"]["cefr_level"];
          id?: string;
          placement_result_json?: Json;
          placement_status?: string;
          target_level?: Database["public"]["Enums"]["cefr_level"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_levels_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_preferences: {
        Row: {
          audio_settings_json: Json;
          created_at: string;
          daily_minutes: number;
          id: string;
          learning_goals_json: Json;
          notifications_enabled: boolean;
          target_level: Database["public"]["Enums"]["cefr_level"];
          theme: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          audio_settings_json?: Json;
          created_at?: string;
          daily_minutes?: number;
          id?: string;
          learning_goals_json?: Json;
          notifications_enabled?: boolean;
          target_level?: Database["public"]["Enums"]["cefr_level"];
          theme?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          audio_settings_json?: Json;
          created_at?: string;
          daily_minutes?: number;
          id?: string;
          learning_goals_json?: Json;
          notifications_enabled?: boolean;
          target_level?: Database["public"]["Enums"]["cefr_level"];
          theme?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      vocabulary: {
        Row: {
          antonyms_json: Json;
          audio_url: string | null;
          collocations_json: Json;
          created_at: string;
          definitions_zh_tw: string[];
          example_sentences: string[];
          frequency_rank: number | null;
          gender: string | null;
          governing_case: string | null;
          id: string;
          lemma: string;
          level: Database["public"]["Enums"]["cefr_level"];
          part_of_speech: string;
          plural: string | null;
          principal_parts_json: Json;
          reflexive: boolean;
          region: string;
          register: string;
          required_preposition: string | null;
          separable_prefix: string | null;
          status: Database["public"]["Enums"]["content_status"];
          synonyms_json: Json;
          updated_at: string;
          version: number;
        };
        Insert: {
          antonyms_json?: Json;
          audio_url?: string | null;
          collocations_json?: Json;
          created_at?: string;
          definitions_zh_tw: string[];
          example_sentences?: string[];
          frequency_rank?: number | null;
          gender?: string | null;
          governing_case?: string | null;
          id?: string;
          lemma: string;
          level: Database["public"]["Enums"]["cefr_level"];
          part_of_speech: string;
          plural?: string | null;
          principal_parts_json?: Json;
          reflexive?: boolean;
          region?: string;
          register?: string;
          required_preposition?: string | null;
          separable_prefix?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          synonyms_json?: Json;
          updated_at?: string;
          version?: number;
        };
        Update: {
          antonyms_json?: Json;
          audio_url?: string | null;
          collocations_json?: Json;
          created_at?: string;
          definitions_zh_tw?: string[];
          example_sentences?: string[];
          frequency_rank?: number | null;
          gender?: string | null;
          governing_case?: string | null;
          id?: string;
          lemma?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          part_of_speech?: string;
          plural?: string | null;
          principal_parts_json?: Json;
          reflexive?: boolean;
          region?: string;
          register?: string;
          required_preposition?: string | null;
          separable_prefix?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          synonyms_json?: Json;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      writing_prompt_rules: {
        Row: {
          created_at: string;
          grading_notes_zh_tw: string;
          id: string;
          prompt_id: string;
          reference_outline_json: Json;
          reference_version_de: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          grading_notes_zh_tw: string;
          id?: string;
          prompt_id: string;
          reference_outline_json?: Json;
          reference_version_de: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          grading_notes_zh_tw?: string;
          id?: string;
          prompt_id?: string;
          reference_outline_json?: Json;
          reference_version_de?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "writing_prompt_rules_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: true;
            referencedRelation: "writing_prompts";
            referencedColumns: ["id"];
          },
        ];
      };
      writing_prompts: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          estimated_minutes: number;
          id: string;
          lesson_id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          maximum_words: number;
          minimum_words: number;
          prompt_de: string;
          prompt_zh_tw: string;
          requirements_json: Json;
          review_status: Database["public"]["Enums"]["review_status"];
          skill_ids: string[];
          status: Database["public"]["Enums"]["content_status"];
          title_zh_tw: string;
          updated_at: string;
          version: number;
          writing_type: Database["public"]["Enums"]["writing_type"];
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          estimated_minutes: number;
          id?: string;
          lesson_id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          maximum_words: number;
          minimum_words: number;
          prompt_de: string;
          prompt_zh_tw: string;
          requirements_json?: Json;
          review_status?: Database["public"]["Enums"]["review_status"];
          skill_ids: string[];
          status?: Database["public"]["Enums"]["content_status"];
          title_zh_tw: string;
          updated_at?: string;
          version?: number;
          writing_type: Database["public"]["Enums"]["writing_type"];
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          estimated_minutes?: number;
          id?: string;
          lesson_id?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          maximum_words?: number;
          minimum_words?: number;
          prompt_de?: string;
          prompt_zh_tw?: string;
          requirements_json?: Json;
          review_status?: Database["public"]["Enums"]["review_status"];
          skill_ids?: string[];
          status?: Database["public"]["Enums"]["content_status"];
          title_zh_tw?: string;
          updated_at?: string;
          version?: number;
          writing_type?: Database["public"]["Enums"]["writing_type"];
        };
        Relationships: [
          {
            foreignKeyName: "writing_prompts_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      writing_submissions: {
        Row: {
          created_at: string;
          current_version_id: string | null;
          id: string;
          lesson_id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          prompt_id: string;
          status: Database["public"]["Enums"]["writing_submission_status"];
          updated_at: string;
          user_id: string;
          writing_type: Database["public"]["Enums"]["writing_type"];
        };
        Insert: {
          created_at?: string;
          current_version_id?: string | null;
          id?: string;
          lesson_id: string;
          level: Database["public"]["Enums"]["cefr_level"];
          prompt_id: string;
          status?: Database["public"]["Enums"]["writing_submission_status"];
          updated_at?: string;
          user_id: string;
          writing_type: Database["public"]["Enums"]["writing_type"];
        };
        Update: {
          created_at?: string;
          current_version_id?: string | null;
          id?: string;
          lesson_id?: string;
          level?: Database["public"]["Enums"]["cefr_level"];
          prompt_id?: string;
          status?: Database["public"]["Enums"]["writing_submission_status"];
          updated_at?: string;
          user_id?: string;
          writing_type?: Database["public"]["Enums"]["writing_type"];
        };
        Relationships: [
          {
            foreignKeyName: "writing_submissions_current_version_fk";
            columns: ["current_version_id"];
            isOneToOne: false;
            referencedRelation: "writing_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "writing_submissions_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "writing_submissions_prompt_id_fkey";
            columns: ["prompt_id"];
            isOneToOne: false;
            referencedRelation: "writing_prompts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "writing_submissions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      writing_versions: {
        Row: {
          ai_feedback_id: string | null;
          created_at: string;
          diff_json: Json;
          id: string;
          idempotency_key: string;
          previous_version_id: string | null;
          submission_id: string;
          text_de: string;
          updated_at: string;
          user_id: string;
          version_number: number;
          word_count: number;
        };
        Insert: {
          ai_feedback_id?: string | null;
          created_at?: string;
          diff_json?: Json;
          id?: string;
          idempotency_key: string;
          previous_version_id?: string | null;
          submission_id: string;
          text_de: string;
          updated_at?: string;
          user_id: string;
          version_number: number;
          word_count: number;
        };
        Update: {
          ai_feedback_id?: string | null;
          created_at?: string;
          diff_json?: Json;
          id?: string;
          idempotency_key?: string;
          previous_version_id?: string | null;
          submission_id?: string;
          text_de?: string;
          updated_at?: string;
          user_id?: string;
          version_number?: number;
          word_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "writing_versions_ai_feedback_id_fkey";
            columns: ["ai_feedback_id"];
            isOneToOne: true;
            referencedRelation: "ai_feedback";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "writing_versions_previous_version_id_fkey";
            columns: ["previous_version_id"];
            isOneToOne: false;
            referencedRelation: "writing_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "writing_versions_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "writing_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "writing_versions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_app_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      current_profile_id: { Args: never; Returns: string };
      delete_own_writing_submission: {
        Args: { p_submission_id: string };
        Returns: boolean;
      };
      is_content_team: { Args: never; Returns: boolean };
      mark_writing_evaluation_failed: {
        Args: { p_user_id: string; p_version_id: string };
        Returns: undefined;
      };
      prepare_writing_version: {
        Args: {
          p_diff_json: Json;
          p_expected_current_version_id: string;
          p_idempotency_key: string;
          p_prompt_id: string;
          p_submission_id: string;
          p_text_de: string;
          p_user_id: string;
          p_word_count: number;
        };
        Returns: Json;
      };
      record_ai_attempt: {
        Args: {
          p_cache_key: string;
          p_cached_from_id?: string;
          p_duration_ms: number;
          p_exercise_id: string;
          p_feedback_json: Json;
          p_idempotency_key: string;
          p_mode: Database["public"]["Enums"]["attempt_mode"];
          p_model: string;
          p_prompt_id: string;
          p_prompt_version: string;
          p_response_de: string;
          p_review_id?: string;
          p_schema_version: string;
          p_used_hint: boolean;
          p_user_id: string;
        };
        Returns: Json;
      };
      record_fixed_attempt: {
        Args: {
          p_answer_json: Json;
          p_duration_ms: number;
          p_exercise_id: string;
          p_grading_result_json: Json;
          p_idempotency_key: string;
          p_is_correct: boolean;
          p_mode: Database["public"]["Enums"]["attempt_mode"];
          p_normalized_answer_json: Json;
          p_review_id?: string;
          p_score: number;
          p_used_hint: boolean;
        };
        Returns: Json;
      };
      record_writing_feedback: {
        Args: {
          p_feedback_json: Json;
          p_model: string;
          p_prompt_id: string;
          p_prompt_version: string;
          p_schema_version: string;
          p_user_id: string;
          p_version_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      activity_type: "instruction" | "practice" | "review" | "quiz" | "task";
      app_role: "learner" | "content_editor" | "reviewer" | "admin";
      attempt_mode: "lesson" | "review" | "practice" | "placement";
      cefr_level: "B1" | "B2" | "C1" | "C2";
      content_status:
        "draft" | "pending_review" | "approved" | "published" | "rejected" | "archived";
      error_severity: "minor" | "moderate" | "major" | "critical";
      error_type:
        | "spelling"
        | "capitalization"
        | "punctuation"
        | "article"
        | "gender"
        | "case"
        | "declension"
        | "adjective_ending"
        | "verb_conjugation"
        | "tense"
        | "auxiliary"
        | "word_order"
        | "subordinate_clause"
        | "preposition"
        | "verb_preposition"
        | "pronoun"
        | "relative_clause"
        | "passive_voice"
        | "subjunctive"
        | "collocation"
        | "word_choice"
        | "register"
        | "coherence"
        | "cohesion"
        | "argumentation"
        | "task_completion"
        | "style"
        | "idiomaticity"
        | "redundancy"
        | "ambiguity"
        | "pronunciation"
        | "fluency";
      exercise_type:
        | "multiple_choice"
        | "multiple_select"
        | "fill_blank"
        | "sentence_order"
        | "matching"
        | "translation"
        | "dictation"
        | "error_correction"
        | "reading_comprehension"
        | "listening_comprehension"
        | "free_response"
        | "speaking"
        | "conversation"
        | "essay"
        | "summary"
        | "paraphrase"
        | "argumentation"
        | "mediation"
        | "oral_presentation";
      lesson_progress_status: "not_started" | "in_progress" | "completed";
      review_queue_status: "scheduled" | "completed" | "skipped" | "cancelled";
      review_status: "draft" | "pending_review" | "approved" | "rejected";
      skill_category:
        | "vocabulary"
        | "grammar"
        | "reading"
        | "listening"
        | "writing"
        | "speaking"
        | "interaction"
        | "mediation"
        | "pronunciation"
        | "exam_preparation";
      source_type: "human" | "ai_generated" | "ai_assisted";
      writing_submission_status:
        "evaluating" | "revision_requested" | "completed" | "evaluation_failed";
      writing_type:
        | "informal_email"
        | "formal_email"
        | "experience_description"
        | "opinion"
        | "complaint_letter"
        | "advantages_disadvantages"
        | "argumentative_essay"
        | "forum_post"
        | "summary"
        | "formal_report"
        | "academic_argument"
        | "source_integration"
        | "structured_review"
        | "advanced_essay"
        | "style_transformation"
        | "critical_review"
        | "professional_editing"
        | "advanced_synthesis"
        | "rhetorical_revision";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey";
            columns: ["namespace_id"];
            isOneToOne: false;
            referencedRelation: "iceberg_namespaces";
            referencedColumns: ["id"];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_type: ["instruction", "practice", "review", "quiz", "task"],
      app_role: ["learner", "content_editor", "reviewer", "admin"],
      attempt_mode: ["lesson", "review", "practice", "placement"],
      cefr_level: ["B1", "B2", "C1", "C2"],
      content_status: ["draft", "pending_review", "approved", "published", "rejected", "archived"],
      error_severity: ["minor", "moderate", "major", "critical"],
      error_type: [
        "spelling",
        "capitalization",
        "punctuation",
        "article",
        "gender",
        "case",
        "declension",
        "adjective_ending",
        "verb_conjugation",
        "tense",
        "auxiliary",
        "word_order",
        "subordinate_clause",
        "preposition",
        "verb_preposition",
        "pronoun",
        "relative_clause",
        "passive_voice",
        "subjunctive",
        "collocation",
        "word_choice",
        "register",
        "coherence",
        "cohesion",
        "argumentation",
        "task_completion",
        "style",
        "idiomaticity",
        "redundancy",
        "ambiguity",
        "pronunciation",
        "fluency",
      ],
      exercise_type: [
        "multiple_choice",
        "multiple_select",
        "fill_blank",
        "sentence_order",
        "matching",
        "translation",
        "dictation",
        "error_correction",
        "reading_comprehension",
        "listening_comprehension",
        "free_response",
        "speaking",
        "conversation",
        "essay",
        "summary",
        "paraphrase",
        "argumentation",
        "mediation",
        "oral_presentation",
      ],
      lesson_progress_status: ["not_started", "in_progress", "completed"],
      review_queue_status: ["scheduled", "completed", "skipped", "cancelled"],
      review_status: ["draft", "pending_review", "approved", "rejected"],
      skill_category: [
        "vocabulary",
        "grammar",
        "reading",
        "listening",
        "writing",
        "speaking",
        "interaction",
        "mediation",
        "pronunciation",
        "exam_preparation",
      ],
      source_type: ["human", "ai_generated", "ai_assisted"],
      writing_submission_status: [
        "evaluating",
        "revision_requested",
        "completed",
        "evaluation_failed",
      ],
      writing_type: [
        "informal_email",
        "formal_email",
        "experience_description",
        "opinion",
        "complaint_letter",
        "advantages_disadvantages",
        "argumentative_essay",
        "forum_post",
        "summary",
        "formal_report",
        "academic_argument",
        "source_integration",
        "structured_review",
        "advanced_essay",
        "style_transformation",
        "critical_review",
        "professional_editing",
        "advanced_synthesis",
        "rhetorical_revision",
      ],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
