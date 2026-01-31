import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/debug/pending-drivers
 * Debug API to test pending drivers query
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vlyhwegpvpnjyocqmfqc.supabase.co';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZseWh3ZWdwdnBuanlvY3FtZnFjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk3Nzk5NiwiZXhwIjoyMDc0NTUzOTk2fQ.nQPynfQcSIZ1QPVSjDcgscugQcEgfRPUauW0psSRTQo';

    console.log('🔍 Debug: Testing pending drivers query');
    console.log('URL:', supabaseUrl);
    console.log('Key prefix:', supabaseServiceKey.substring(0, 20) + '...');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Test 1: Get all drivers
    const { data: allDrivers, error: allError } = await supabase
      .from('drivers')
      .select('id, user_id, review_status, background_check_status');

    // Test 2: Get pending_review drivers
    const { data: pendingDrivers, error: pendingError } = await supabase
      .from('drivers')
      .select('id, user_id, review_status, review_submitted_at')
      .eq('review_status', 'pending_review');

    // Test 3: Raw query using RPC (if available)
    let rawResult = null;
    try {
      const { data, error } = await supabase.rpc('get_pending_drivers');
      rawResult = { data, error: error?.message };
    } catch (e) {
      rawResult = { error: 'RPC not available' };
    }

    return NextResponse.json({
      success: true,
      debug: {
        supabaseUrl,
        keyUsed: supabaseServiceKey.substring(0, 30) + '...',
        envKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
      allDrivers: {
        count: allDrivers?.length || 0,
        data: allDrivers,
        error: allError?.message,
      },
      pendingDrivers: {
        count: pendingDrivers?.length || 0,
        data: pendingDrivers,
        error: pendingError?.message,
      },
      rawResult,
    });
  } catch (error: any) {
    console.error('❌ Debug API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

