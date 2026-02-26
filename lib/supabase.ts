import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types (should match your Supabase schema)
export interface Database {
  public: {
    Tables: {
      funds: {
        Row: {
          id: string
          code: string
          name: string
          type: string
          company: string
          net_value: number
          total_assets: number
          day_growth: number
          week_growth: number
          month_growth: number
          year_growth: number
          management_fee: number
          custodian_fee: number
          establishment_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          code: string
          name: string
          type: string
          company: string
          net_value: number
          total_assets: number
          day_growth: number
          week_growth: number
          month_growth: number
          year_growth: number
          management_fee: number
          custodian_fee: number
          establishment_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Update: {
          id: string
          code: string
          name: string
          type: string
          company: string
          net_value: number
          total_assets: number
          day_growth: number
          week_growth: number
          month_growth: number
          year_growth: number
          management_fee: number
          custodian_fee: number
          establishment_date: string
          status: string
          created_at: string
          updated_at: string
        }
      }
      fund_comparison: {
        Row: {
          id: string
          name: string
          funds: string[]
          user_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          funds: string[]
          user_id: string
          created_at: string
          updated_at: string
        }
        Update: {
          id: string
          name: string
          funds: string[]
          user_id: string
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
