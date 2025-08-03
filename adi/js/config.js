// Configuration object with actual Supabase credentials
const CONFIG = {
    supabase: {
        url: 'https://yqphthblvsteecczprcs.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxcGh0aGJsdnN0ZWVjY3pwcmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxMjE3MDQsImV4cCI6MjA2ODY5NzcwNH0.moAWw96xbIZEFnBIIWAi36OfuahyqO0WBzJdilXeBfg'
    }
};

// Application configuration
const APP_CONFIG = {
    DEFAULT_HOURLY_RATE: 25.00,
    CURRENCY: 'GBP',
    CURRENCY_SYMBOL: '£'
};

// Make CONFIG available globally
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
    window.APP_CONFIG = APP_CONFIG;
}

// Export for ES6 modules
export { CONFIG, APP_CONFIG };