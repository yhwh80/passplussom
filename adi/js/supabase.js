// Global supabase instance - single declaration
let supabase;

function initSupabase() {
    if (!supabase && typeof CONFIG !== 'undefined') {
        try {
            supabase = window.supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.anonKey
            );
            console.log('✅ Supabase initialized successfully');
            return supabase;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            throw error;
        }
    }
    return supabase;
}

// Auto-initialize when this script loads
if (typeof window !== 'undefined' && window.supabase) {
    initSupabase();
}
