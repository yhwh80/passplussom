/* ===================================
   Pass Plus SOM - Supabase Integration
   Database and authentication with Supabase
   =================================== */

// Supabase client initialization
let supabaseClient = null;

// Initialize Supabase client
function initializeSupabase() {
  if (typeof supabase === 'undefined') {
    Logger.warn('Supabase library not loaded. Using mock data mode.');
    return null;
  }
  
  if (!CONFIG.supabase.url || !CONFIG.supabase.anonKey) {
    throw new Error('Supabase configuration missing. Please check CONFIG.supabase values.');
  }
  
  supabaseClient = supabase.createClient(
    CONFIG.supabase.url,
    CONFIG.supabase.anonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  );
  
  Logger.info('Supabase client initialized');
  return supabaseClient;
}

// Get Supabase client instance
function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = initializeSupabase();
  }
  if (!supabaseClient) {
    throw new Error('Supabase library not loaded. Please include the Supabase CDN script.');
  }
  return supabaseClient;
}

// Database operations
const Database = {
  // Generic select operation
  async select(table, columns = '*', filters = {}, options = {}) {
    try {
      const client = getSupabaseClient();
      let query = client.from(table).select(columns);
      
      // Apply filters
      Object.entries(filters).forEach(([column, value]) => {
        if (Array.isArray(value)) {
          query = query.in(column, value);
        } else if (typeof value === 'object' && value.operator) {
          query = query.filter(column, value.operator, value.value);
        } else {
          query = query.eq(column, value);
        }
      });
      
      // Apply options
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending !== false 
        });
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      Logger.debug(`Selected ${data?.length || 0} records from ${table}`);
      return data;
    } catch (error) {
      Logger.error(`Error selecting from ${table}:`, error);
      throw error;
    }
  },
  
  // Generic insert operation
  async insert(table, data, options = {}) {
    try {
      const client = getSupabaseClient();
      let query = client.from(table).insert(data);
      
      if (options.select) {
        query = query.select(options.select);
      }
      
      const { data: result, error } = await query;
      
      if (error) {
        throw error;
      }
      
      Logger.debug(`Inserted record into ${table}:`, result);
      return result;
    } catch (error) {
      Logger.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  },
  
  // Generic update operation
  async update(table, data, filters = {}, options = {}) {
    try {
      const client = getSupabaseClient();
      let query = client.from(table).update(data);
      
      // Apply filters
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      if (options.select) {
        query = query.select(options.select);
      }
      
      const { data: result, error } = await query;
      
      if (error) {
        throw error;
      }
      
      Logger.debug(`Updated ${result?.length || 0} records in ${table}`);
      return result;
    } catch (error) {
      Logger.error(`Error updating ${table}:`, error);
      throw error;
    }
  },
  
  // Generic delete operation
  async delete(table, filters = {}) {
    try {
      const client = getSupabaseClient();
      let query = client.from(table).delete();
      
      // Apply filters
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      const { data, error } = await query;
      
      if (error) {
        throw error;
      }
      
      Logger.debug(`Deleted records from ${table}`);
      return data;
    } catch (error) {
      Logger.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  },
  
  // Count records
  async count(table, filters = {}) {
    try {
      const client = getSupabaseClient();
      let query = client.from(table).select('*', { count: 'exact', head: true });
      
      // Apply filters
      Object.entries(filters).forEach(([column, value]) => {
        query = query.eq(column, value);
      });
      
      const { count, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return count;
    } catch (error) {
      Logger.error(`Error counting ${table}:`, error);
      throw error;
    }
  }
};

// Mock data for development
const MockData = {
  instructors: [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+44 7700 900123',
      areas: [{ area_name: 'North London' }, { area_name: 'Camden' }],
      preferences: [{ standard_lesson_price: 35 }],
      qualifications: [{ qualification_type: 'ADI Certified' }],
      vehicles: [{ make: 'Ford', model: 'Focus', year: 2022 }]
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'michael@example.com',
      phone: '+44 7700 900124',
      areas: [{ area_name: 'East London' }, { area_name: 'Stratford' }],
      preferences: [{ standard_lesson_price: 40 }],
      qualifications: [{ qualification_type: 'ADI Certified' }],
      vehicles: [{ make: 'Toyota', model: 'Corolla', year: 2023 }]
    },
    {
      id: '3',
      name: 'Emma Wilson',
      email: 'emma@example.com',
      phone: '+44 7700 900125',
      areas: [{ area_name: 'South London' }, { area_name: 'Croydon' }],
      preferences: [{ standard_lesson_price: 38 }],
      qualifications: [{ qualification_type: 'ADI Certified' }],
      vehicles: [{ make: 'Vauxhall', model: 'Astra', year: 2021 }]
    },
    {
      id: '4',
      name: 'David Brown',
      email: 'david@example.com',
      phone: '+44 7700 900126',
      areas: [{ area_name: 'West London' }, { area_name: 'Ealing' }],
      preferences: [{ standard_lesson_price: 42 }],
      qualifications: [{ qualification_type: 'ADI Certified' }],
      vehicles: [{ make: 'Nissan', model: 'Micra', year: 2022 }]
    }
  ]
};

// Instructor operations
const InstructorService = {
  // Get all instructors
  async getAllInstructors(filters = {}) {
    try {
      const instructors = await Database.select('instructors', '*', filters, {
        orderBy: { column: 'name', ascending: true }
      });
      
      // Fetch related data
      for (let instructor of instructors) {
        instructor.areas = await Database.select('areas', '*', { instructor_id: instructor.id });
        instructor.preferences = await Database.select('preferences', '*', { instructor_id: instructor.id });
        instructor.qualifications = await Database.select('qualifications', '*', { instructor_id: instructor.id });
        instructor.vehicles = await Database.select('vehicles', '*', { instructor_id: instructor.id });
      }
      
      return instructors;
    } catch (error) {
      Logger.warn('Database unavailable, using mock data:', error.message);
      return MockData.instructors;
    }
  },
  
  // Get instructor by ID
  async getInstructorById(id) {
    const instructors = await Database.select('instructors', '*', { id });
    if (!instructors.length) {
      throw new Error('Instructor not found');
    }
    
    const instructor = instructors[0];
    
    // Fetch related data
    instructor.areas = await Database.select('areas', '*', { instructor_id: id });
    instructor.preferences = await Database.select('preferences', '*', { instructor_id: id });
    instructor.qualifications = await Database.select('qualifications', '*', { instructor_id: id });
    instructor.vehicles = await Database.select('vehicles', '*', { instructor_id: id });
    
    return instructor;
  },
  
  // Search instructors by postcode/area
  async searchInstructors(postcode, radius = 10) {
    try {
      // This would need geocoding to work properly
      // For now, we'll search in the areas table
      const areas = await Database.select('areas', 'instructor_id', { 
        postcode: { operator: 'ilike', value: `%${postcode.slice(0, 2)}%` }
      });
      
      if (!areas.length) {
        return [];
      }
      
      const instructorIds = areas.map(area => area.instructor_id);
      const instructors = await Database.select('instructors', '*', { 
        id: instructorIds 
      });
      
      // Add areas and preferences
      for (let instructor of instructors) {
        instructor.areas = await Database.select('areas', '*', { instructor_id: instructor.id });
        instructor.preferences = await Database.select('preferences', '*', { instructor_id: instructor.id });
      }
      
      return instructors;
    } catch (error) {
      Logger.warn('Database unavailable for search, using mock data:', error.message);
      // Return filtered mock data based on postcode
      return MockData.instructors.filter(instructor => 
        instructor.areas.some(area => 
          area.area_name.toLowerCase().includes('london') || 
          postcode.toLowerCase().includes('london')
        )
      );
    }
  }
};

// Pupil operations
const PupilService = {
  // Create pupil account
  async createPupilAccount(pupilData) {
    // Validate required fields
    if (!pupilData.email || !pupilData.first_name || !pupilData.last_name) {
      throw new Error('Missing required fields: email, first_name, last_name');
    }
    
    // Hash password (this should be done server-side in production)
    if (pupilData.password) {
      // Note: In production, password hashing should be handled by Supabase Auth
      delete pupilData.password; // Remove password from data
    }
    
    const pupil = await Database.insert('pupil_accounts', {
      ...pupilData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { select: '*' });
    
    return pupil[0];
  },
  
  // Get pupil by ID
  async getPupilById(id) {
    const pupils = await Database.select('pupil_accounts', '*', { id });
    if (!pupils.length) {
      throw new Error('Pupil not found');
    }
    return pupils[0];
  },
  
  // Update pupil account
  async updatePupilAccount(id, updateData) {
    updateData.updated_at = new Date().toISOString();
    
    const pupil = await Database.update('pupil_accounts', updateData, { id }, { select: '*' });
    return pupil[0];
  }
};

// Booking operations
const BookingService = {
  // Create booking request
  async createBookingRequest(bookingData) {
    // Validate required fields
    const required = ['pupil_account_id', 'instructor_id', 'lesson_date', 'start_time', 'amount'];
    const missing = required.filter(field => !bookingData[field]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    const booking = await Database.insert('booking_requests', {
      ...bookingData,
      status: 'pending',
      payment_status: 'unpaid',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { select: '*' });
    
    Logger.info('Booking request created:', booking[0]);
    return booking[0];
  },
  
  // Get booking by ID
  async getBookingById(id) {
    const bookings = await Database.select('booking_requests', '*', { id });
    if (!bookings.length) {
      throw new Error('Booking not found');
    }
    
    const booking = bookings[0];
    
    // Fetch related data
    booking.pupil = await Database.select('pupil_accounts', 'first_name, last_name, email, phone', 
      { id: booking.pupil_account_id });
    booking.instructor = await Database.select('instructors', 'name, email, phone', 
      { id: booking.instructor_id });
    
    return booking;
  },
  
  // Get bookings for pupil
  async getBookingsForPupil(pupilId, options = {}) {
    const filters = { pupil_account_id: pupilId };
    
    if (options.status) {
      filters.status = options.status;
    }
    
    if (options.upcoming) {
      filters.lesson_date = { operator: 'gte', value: new Date().toISOString().split('T')[0] };
    }
    
    const bookings = await Database.select('booking_requests', '*', filters, {
      orderBy: { column: 'lesson_date', ascending: true }
    });
    
    // Add instructor names
    for (let booking of bookings) {
      const instructor = await Database.select('instructors', 'name', { id: booking.instructor_id });
      booking.instructor_name = instructor[0]?.name || 'Unknown';
    }
    
    return bookings;
  },
  
  // Update booking status
  async updateBookingStatus(id, status, paymentStatus = null) {
    const updateData = { 
      status,
      updated_at: new Date().toISOString()
    };
    
    if (paymentStatus) {
      updateData.payment_status = paymentStatus;
    }
    
    const booking = await Database.update('booking_requests', updateData, { id }, { select: '*' });
    return booking[0];
  },
  
  // Cancel booking
  async cancelBooking(id, reason = null) {
    const updateData = {
      status: 'cancelled',
      updated_at: new Date().toISOString()
    };
    
    if (reason) {
      updateData.notes = updateData.notes ? `${updateData.notes}\nCancellation reason: ${reason}` : `Cancellation reason: ${reason}`;
    }
    
    const booking = await Database.update('booking_requests', updateData, { id }, { select: '*' });
    return booking[0];
  },
  
  // Get instructor availability
  async getInstructorAvailability(instructorId, date) {
    // Get existing bookings for the date
    const bookings = await Database.select('booking_requests', 'start_time, duration', {
      instructor_id: instructorId,
      lesson_date: date,
      status: { operator: 'neq', value: 'cancelled' }
    });
    
    // Get instructor preferences
    const preferences = await Database.select('preferences', '*', { instructor_id: instructorId });
    const prefs = preferences[0] || {};
    
    // Generate available slots (this is a simplified version)
    const workingStart = prefs.working_hours_start || '09:00';
    const workingEnd = prefs.working_hours_end || '17:00';
    
    const availableSlots = [];
    const startHour = parseInt(workingStart.split(':')[0]);
    const endHour = parseInt(workingEnd.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      
      // Check if slot is not booked
      const isBooked = bookings.some(booking => {
        const bookingStart = booking.start_time;
        const bookingEnd = new Date(`2000-01-01T${bookingStart}`);
        bookingEnd.setMinutes(bookingEnd.getMinutes() + (booking.duration || 60));
        
        const slotTime = new Date(`2000-01-01T${timeSlot}`);
        const slotEnd = new Date(slotTime);
        slotEnd.setHours(slotEnd.getHours() + 1);
        
        return (slotTime >= new Date(`2000-01-01T${bookingStart}`) && 
                slotTime < bookingEnd) ||
               (slotEnd > new Date(`2000-01-01T${bookingStart}`) && 
                slotEnd <= bookingEnd);
      });
      
      if (!isBooked) {
        availableSlots.push({
          time: timeSlot,
          available: true
        });
      }
    }
    
    return availableSlots;
  }
};

// Authentication operations
const AuthService = {
  // Sign up with email and password
  async signUp(email, password, metadata = {}) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      });
      
      if (error) {
        throw error;
      }
      
      Logger.info('User signed up:', data.user?.email);
      return data;
    } catch (error) {
      Logger.error('Sign up error:', error);
      throw error;
    }
  },
  
  // Sign in with email and password
  async signIn(email, password) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      Logger.info('User signed in:', data.user?.email);
      return data;
    } catch (error) {
      Logger.error('Sign in error:', error);
      throw error;
    }
  },

  // Sign in with OAuth (Google, etc.)
  async signInWithOAuth(provider, options = {}) {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options
      });

      if (error) {
        throw error;
      }

      Logger.info(`OAuth sign in initiated with ${provider}`);
      return { data, error: null };
    } catch (error) {
      Logger.error('OAuth sign in error:', error);
      return { data: null, error };
    }
  },

  // Sign out
  async signOut() {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      Logger.info('User signed out');
      return true;
    } catch (error) {
      Logger.error('Sign out error:', error);
      throw error;
    }
  },
  
  // Get current user
  async getCurrentUser() {
    try {
      const client = getSupabaseClient();
      const { data: { user }, error } = await client.auth.getUser();

      if (error) {
        throw error;
      }

      return user;
    } catch (error) {
      Logger.error('Get user error:', error);
      return null;
    }
  },

  // Get current session (includes OAuth sessions)
  async getSession() {
    try {
      const client = getSupabaseClient();
      const { data: { session }, error } = await client.auth.getSession();

      if (error) {
        throw error;
      }

      return session;
    } catch (error) {
      Logger.error('Get session error:', error);
      return null;
    }
  },
  
  // Listen to auth state changes
  onAuthStateChange(callback) {
    const client = getSupabaseClient();
    return client.auth.onAuthStateChange(callback);
  },
  
  // Reset password
  async resetPassword(email) {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) {
        throw error;
      }
      
      Logger.info('Password reset email sent to:', email);
      return true;
    } catch (error) {
      Logger.error('Password reset error:', error);
      throw error;
    }
  },
  
  // Update password
  async updatePassword(newPassword) {
    try {
      const client = getSupabaseClient();
      const { error } = await client.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        throw error;
      }
      
      Logger.info('Password updated successfully');
      return true;
    } catch (error) {
      Logger.error('Password update error:', error);
      throw error;
    }
  }
};

// Postcode validation using postcodes.io API
const PostcodeService = {
  // Validate UK postcode
  async validatePostcode(postcode) {
    try {
      const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
      const response = await HTTP.get(`${CONFIG.api.postcodesIo}/postcodes/${cleanPostcode}/validate`);
      
      return {
        valid: response.result,
        postcode: cleanPostcode
      };
    } catch (error) {
      Logger.warn('Postcode validation failed:', error);
      return {
        valid: false,
        postcode: postcode,
        error: error.message
      };
    }
  },
  
  // Get postcode information
  async getPostcodeInfo(postcode) {
    try {
      const cleanPostcode = postcode.replace(/\s/g, '').toUpperCase();
      const response = await HTTP.get(`${CONFIG.api.postcodesIo}/postcodes/${cleanPostcode}`);
      
      if (response.result) {
        return {
          valid: true,
          postcode: response.result.postcode,
          region: response.result.region,
          country: response.result.country,
          district: response.result.admin_district,
          ward: response.result.admin_ward,
          longitude: response.result.longitude,
          latitude: response.result.latitude
        };
      }
      
      return { valid: false, postcode };
    } catch (error) {
      Logger.warn('Postcode info lookup failed:', error);
      return { valid: false, postcode, error: error.message };
    }
  }
};

// Notification operations
const NotificationService = {
  // Create notification
  async createNotification(pupilId, bookingId, type, title, message) {
    const notification = await Database.insert('pupil_notifications', {
      pupil_account_id: pupilId,
      booking_request_id: bookingId,
      type,
      title,
      message,
      created_at: new Date().toISOString()
    }, { select: '*' });
    
    return notification[0];
  },
  
  // Get notifications for pupil
  async getNotificationsForPupil(pupilId, unreadOnly = false) {
    const filters = { pupil_account_id: pupilId };
    
    if (unreadOnly) {
      filters.read_at = { operator: 'is', value: null };
    }
    
    const notifications = await Database.select('pupil_notifications', '*', filters, {
      orderBy: { column: 'created_at', ascending: false }
    });
    
    return notifications;
  },
  
  // Mark notification as read
  async markNotificationRead(notificationId) {
    const notification = await Database.update('pupil_notifications', {
      read_at: new Date().toISOString()
    }, { id: notificationId }, { select: '*' });
    
    return notification[0];
  },
  
  // Mark all notifications as read for pupil
  async markAllNotificationsRead(pupilId) {
    const notifications = await Database.update('pupil_notifications', {
      read_at: new Date().toISOString()
    }, { 
      pupil_account_id: pupilId,
      read_at: { operator: 'is', value: null }
    }, { select: '*' });
    
    return notifications;
  }
};

// Initialize Supabase when script loads
if (typeof window !== 'undefined') {
  // Make services globally available
  window.Database = Database;
  window.InstructorService = InstructorService;
  window.PupilService = PupilService;
  window.BookingService = BookingService;
  window.AuthService = AuthService;
  window.PostcodeService = PostcodeService;
  window.NotificationService = NotificationService;
  window.getSupabaseClient = getSupabaseClient;
  window.initializeSupabase = initializeSupabase;
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        initializeSupabase();
      } catch (error) {
        Logger.error('Failed to initialize Supabase:', error);
      }
    });
  } else {
    try {
      initializeSupabase();
    } catch (error) {
      Logger.error('Failed to initialize Supabase:', error);
    }
  }
}

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Database,
    InstructorService,
    PupilService,
    BookingService,
    AuthService,
    PostcodeService,
    NotificationService,
    initializeSupabase,
    getSupabaseClient
  };
}