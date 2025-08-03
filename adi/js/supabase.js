// Global supabase instance - single declaration
let supabase;

function initSupabase() {
    if (!supabase && typeof CONFIG !== 'undefined') {
        try {
            supabase = window.supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.anonKey
            );
            // Supabase initialized successfully
            return supabase;
        } catch (error) {
            console.error('❌ Failed to initialize Supabase:', error);
            throw error;
        }
    }
    return supabase;
}

// Supabase service class for instructor dashboard
class SupabaseService {
    constructor() {
        this.client = null;
        this.init();
    }

    init() {
        this.client = initSupabase();
    }

    getClient() {
        if (!this.client) {
            this.client = initSupabase();
        }
        return this.client;
    }

    // Authentication methods
    async getCurrentUser() {
        try {
            const { data: { user }, error } = await this.getClient().auth.getUser();
            if (error) throw error;
            return user;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    async signIn(email, password) {
        try {
            const { data, error } = await this.getClient().auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Error signing in:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        try {
            const { error } = await this.getClient().auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error signing out:', error);
            return { success: false, error: error.message };
        }
    }

    // Dashboard methods
    async getDashboardStats(instructorId) {
        try {
            // Get total pupils
            const { data: pupils, error: pupilsError } = await this.getClient()
                .from('pupils')
                .select('id')
                .eq('instructor_id', instructorId);

            if (pupilsError) throw pupilsError;

            // Get active lessons this week
            const startOfWeek = new Date();
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);

            const { data: lessons, error: lessonsError } = await this.getClient()
                .from('lessons')
                .select('id')
                .eq('instructor_id', instructorId)
                .gte('lesson_date', startOfWeek.toISOString().split('T')[0])
                .lte('lesson_date', endOfWeek.toISOString().split('T')[0]);

            if (lessonsError) throw lessonsError;

            // Get pending payments
            const { data: payments, error: paymentsError } = await this.getClient()
                .from('payments')
                .select('amount')
                .eq('instructor_id', instructorId)
                .eq('payment_status', 'pending');

            if (paymentsError) throw paymentsError;

            // Get completed skills
            const { data: skills, error: skillsError } = await this.getClient()
                .from('pupil_skills')
                .select('id')
                .eq('instructor_id', instructorId)
                .eq('status', 'completed');

            if (skillsError) throw skillsError;

            const totalRevenue = payments?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;

            return {
                success: true,
                data: {
                    totalPupils: pupils?.length || 0,
                    activeLessons: lessons?.length || 0,
                    pendingPayments: `£${totalRevenue.toFixed(2)}`,
                    completedSkills: skills?.length || 0
                }
            };
        } catch (error) {
            console.error('Error getting dashboard stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Instructor methods
    async getInstructor(instructorId) {
        try {
            const { data, error } = await this.getClient()
                .from('instructors')
                .select('*')
                .eq('id', instructorId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error getting instructor:', error);
            return { success: false, error: error.message };
        }
    }

    async updateInstructor(instructorId, updates) {
        try {
            const { data, error } = await this.getClient()
                .from('instructors')
                .update(updates)
                .eq('id', instructorId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating instructor:', error);
            return { success: false, error: error.message };
        }
    }

    // Pupil methods
    async addPupil(pupilData) {
        try {
            const { data, error } = await this.getClient()
                .from('pupils')
                .insert(pupilData)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error adding pupil:', error);
            return { success: false, error: error.message };
        }
    }

    // Lesson methods
    async getLessons(instructorId) {
        try {
            const { data, error } = await this.getClient()
                .from('lessons')
                .select(`
                    *,
                    pupils (
                        full_name
                    )
                `)
                .eq('instructor_id', instructorId)
                .order('lesson_date', { ascending: true });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting lessons:', error);
            return { success: false, error: error.message };
        }
    }

    // Skills methods
    async getSkills() {
        try {
            const { data, error } = await this.getClient()
                .from('pass_plus_skills')
                .select('*')
                .order('skill_order', { ascending: true });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting skills:', error);
            return { success: false, error: error.message };
        }
    }

    // Payment methods
    async getPayments(instructorId) {
        try {
            const { data, error } = await this.getClient()
                .from('payments')
                .select(`
                    *,
                    pupils (
                        full_name
                    )
                `)
                .eq('instructor_id', instructorId)
                .order('due_date', { ascending: true });

            if (error) throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Error getting payments:', error);
            return { success: false, error: error.message };
        }
    }

    async updatePayment(paymentId, updates) {
        try {
            const { data, error } = await this.getClient()
                .from('payments')
                .update(updates)
                .eq('id', paymentId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating payment:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create and export service instance
const supabaseService = new SupabaseService();

// Auto-initialize when this script loads
if (typeof window !== 'undefined' && window.supabase) {
    initSupabase();
}

// Export for ES6 modules
export { supabaseService };
