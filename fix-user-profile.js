// 修复用户配置记录的脚本
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fsmgroeytsburlgmoxcj.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkzNTAyNCwiZXhwIjoyMDczNTExMDI0fQ.8JxrVYEz37KmRdh69Yi-Nch2H9cgyPuVqGiotsdx4NA';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixUserProfile() {
    const userId = '90ac5541-3170-4384-a1d8-b8990816a95b';

    console.log('Creating user profile with service role...');

    // 直接插入记录
    const { data, error } = await supabase
        .from('user_profiles')
        .insert({
            id: userId,
            monthly_limit: 10,
            current_month_usage: 0,
            total_analyses: 0,
            last_reset_date: new Date().toISOString().split('T')[0]
        });

    console.log('Insert result:', data);
    console.log('Insert error:', error);
}

fixUserProfile().catch(console.error);