/**
 * Tipos escritos a mano a partir de las migraciones SQL reales
 * (supabase/migrations/0001 a 0005), porque este entorno no tiene
 * acceso a red para ejecutar `supabase gen types` contra un proyecto
 * real. Sustituye este archivo por el generado en cuanto tengas tu
 * proyecto Supabase conectado (ver README) — a partir de ahí,
 * cualquier cambio de esquema debe regenerarlo para no desincronizarse.
 *
 * El resto del código sigue usando `as any` en varias consultas: tener
 * tipos reales aquí no lo corrige automáticamente (habría que revisar
 * cada `.select()` una por una), pero deja el terreno preparado para
 * ir retirándolos progresivamente sin tener que empezar de cero.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: "user" | "admin";
          onboarding_completed: boolean;
          onboarding_intent: string | null;
          is_blocked: boolean;
        } & Timestamps;
      };
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          type: "premium_upgrade" | "album_pack" | "nfc_pack" | "combo_pack";
          price_cents: number;
          currency: string;
          album_credits: number;
          nfc_credits: number;
          photo_limit: number | null;
          video_limit: number | null;
          storage_limit_mb: number | null;
          shipping_included: boolean;
          active: boolean;
          sort_order: number;
        } & Timestamps;
      };
      album_credits: {
        Row: {
          id: string;
          user_id: string;
          source_order_id: string | null;
          photo_limit: number;
          video_limit: number;
          storage_limit_mb: number;
          consumed: boolean;
          consumed_by_album_id: string | null;
          created_at: string;
        };
      };
      nfc_credits: {
        Row: {
          id: string;
          user_id: string;
          source_order_id: string | null;
          consumed: boolean;
          consumed_by_nfc_id: string | null;
          created_at: string;
        };
      };
      albums: {
        Row: {
          id: string;
          owner_id: string;
          public_slug: string;
          title: string;
          description: string | null;
          cover_media_id: string | null;
          event_date_start: string | null;
          event_date_end: string | null;
          location_name: string | null;
          location_lat: number | null;
          location_lng: number | null;
          design_theme: string;
          design_font: string;
          design_layout: string;
          music_url: string | null;
          music_title: string | null;
          privacy: "public" | "private";
          privacy_password_hash: string | null;
          status: "draft" | "published";
          is_premium: boolean;
          photo_limit: number;
          video_limit: number;
          storage_limit_mb: number;
          storage_used_mb: number;
          photo_count: number;
          video_count: number;
        } & Timestamps;
      };
      album_media: {
        Row: {
          id: string;
          album_id: string;
          type: "photo" | "video";
          storage_path: string;
          thumbnail_path: string | null;
          file_name: string;
          size_bytes: number;
          width: number | null;
          height: number | null;
          duration_seconds: number | null;
          caption: string | null;
          sort_order: number;
          created_at: string;
        };
      };
      album_memories: {
        Row: {
          id: string;
          album_id: string;
          content: string;
          sort_order: number;
          created_at: string;
        };
      };
      nfc_tags: {
        Row: {
          id: string;
          public_token: string;
          status: "stock" | "reserved" | "sold" | "assigned" | "active" | "disabled";
          owner_id: string | null;
          album_id: string | null;
          order_id: string | null;
          scan_count: number;
          last_scanned_at: string | null;
        } & Timestamps;
      };
      shipping_addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          line1: string;
          line2: string | null;
          city: string;
          province: string | null;
          postal_code: string;
          country: string;
          phone: string | null;
          created_at: string;
        };
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          status: "pending" | "paid" | "failed" | "refunded";
          total_cents: number;
          currency: string;
          shipping_address_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
        } & Timestamps;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price_cents: number;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          order_id: string;
          stripe_payment_intent_id: string;
          amount_cents: number;
          currency: string;
          status: string;
          raw_event: Json | null;
          created_at: string;
        };
      };
      stripe_webhook_events: {
        Row: { id: string; type: string; processed_at: string };
      };
      nfc_fulfillment: {
        Row: {
          id: string;
          nfc_id: string;
          order_id: string;
          status: "pendiente" | "preparando" | "programado" | "enviado" | "entregado";
          updated_at: string;
        };
      };
      analytics_events: {
        Row: {
          id: string;
          user_id: string | null;
          event_name: string;
          metadata: Json;
          created_at: string;
        };
      };
      app_settings: {
        Row: { key: string; value: Json; updated_at: string };
      };
    };
    Functions: {
      is_admin: { Args: { uid: string }; Returns: boolean };
      reserve_nfc_tag: { Args: { p_owner_id: string; p_order_id: string }; Returns: string | null };
      try_consume_album_credit: {
        Args: { p_user_id: string };
        Returns: { id: string; photo_limit: number; video_limit: number; storage_limit_mb: number }[];
      };
      release_album_credit: { Args: { p_credit_id: string }; Returns: void };
      recalculate_album_counters: { Args: { p_album_id: string }; Returns: void };
      recalculate_all_album_counters: { Args: Record<string, never>; Returns: void };
    };
  };
}
