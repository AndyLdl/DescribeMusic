// 调试用户状态的脚本
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fsmgroeytsburlgmoxcj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzbWdyb2V5dHNidXJsZ21veGNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MzUwMjQsImV4cCI6MjA3MzUxMTAyNH0.z6T4B5HtUuLoQD-hmSNJEWCmoXCM0_pNoy5MlaC49ok';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserStatus() {
    const userId = '90ac5541-3170-4384-a1d8-b8990816a95b';

    console.log('Checking user profile...');
    const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

    console.log('Profile:', profile);
    console.log('Profile Error:', profileError);

    console.log('\nChecking monthly limit...');
    const { data: limitData, error: limitError } = await supabase
        .rpc('check_user_monthly_limit', { user_uuid: userId });

    console.log('Limit Data:', limitData);
    console.log('Limit Error:', limitError);
}

checkUserStatus().catch(console.error);