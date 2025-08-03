# Pass Plus School of Motoring

A comprehensive driving lessons booking platform with separate instructor and pupil portals.

## 🚗 Features

### Instructor Portal (`/adi/`)
- **Dashboard** - Overview of lessons, pupils, and earnings
- **Pupil Management** - Add, edit, and track pupil progress
- **Lesson Scheduling** - Calendar-based lesson management
- **Payment Tracking** - Financial overview and transaction history
- **Document Management** - Upload and manage instructor documents
- **Google OAuth** - Secure authentication with Google accounts

### Pupil Portal (`/booking/`)
- **Lesson Booking** - Book lessons with available instructors
- **Dashboard** - View upcoming lessons and progress
- **Payment Integration** - Secure payment processing
- **Google OAuth** - Easy sign-in with Google accounts

## 🔧 Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Authentication**: Google OAuth + Email/Password
- **Styling**: Tailwind CSS
- **Icons**: Lucide Icons

## 🚀 Deployment

### Structure
```
/
├── adi/                    # Instructor Portal (adi.passplussom.com)
│   ├── login.html         # Instructor authentication
│   ├── dashboard.html     # Main instructor dashboard
│   ├── pupils.html        # Pupil management
│   ├── lessons.html       # Lesson scheduling
│   └── js/               # JavaScript modules
│
├── booking/               # Pupil Portal (bookings.passplussom.com)
│   ├── login.html        # Pupil authentication
│   ├── dashboard.html    # Pupil dashboard
│   ├── book-lesson.html  # Lesson booking interface
│   └── js/              # JavaScript modules
│
└── shared/               # Shared resources
    ├── css/             # Common stylesheets
    └── assets/          # Images and icons
```

### Domain Mapping
- **Instructor Portal**: `adi.passplussom.com` → `/adi/` folder
- **Pupil Portal**: `bookings.passplussom.com` → `/booking/` folder

## 🔐 Authentication

Both portals support:
- ✅ **Google OAuth** - One-click sign-in with Google
- ✅ **Email/Password** - Traditional authentication
- ✅ **Session Management** - Secure session handling
- ✅ **Auto-redirect** - Seamless OAuth callback handling

## 📱 Features

- **Responsive Design** - Works on all devices
- **PWA Support** - Progressive Web App capabilities
- **Real-time Updates** - Live data synchronization
- **Secure Payments** - Integrated payment processing
- **Document Upload** - File management system

## 🛠️ Setup

1. **Configure Supabase**
   - Set up database tables
   - Configure authentication providers
   - Set redirect URLs

2. **Deploy Files**
   - Upload `/adi/` to instructor domain
   - Upload `/booking/` to pupil domain

3. **Configure DNS**
   - Point domains to hosting
   - Set up SSL certificates

## 📊 Database

Uses Supabase with tables for:
- `instructors` - Instructor profiles and details
- `pupils` - Pupil information and progress
- `lessons` - Lesson scheduling and history
- `transactions` - Payment and financial records
- `documents` - File uploads and management

## 🔒 Security

- **Row Level Security (RLS)** - Database-level access control
- **OAuth Integration** - Secure third-party authentication
- **Input Validation** - Client and server-side validation
- **HTTPS Only** - Encrypted connections

---

**Last Updated**: August 2025
**Version**: 2.0 (Google OAuth Integration)
