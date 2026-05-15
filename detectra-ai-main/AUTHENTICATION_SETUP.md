# Authentication Setup Guide

This guide will help you set up the authentication system for Detectra AI.

## Environment Variables Setup

Create a `.env` file in the root directory of your project with the following content:

```env
VITE_SUPABASE_URL=https://txkwnceefmaotmqluajc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4a3duY2VlZm1hb3RtcWx1YWpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDY1OTksImV4cCI6MjA3NzAyMjU5OX0.YGZdhYEA4rI3dQCSKPIOfW0wiROkhzdMfUOaHH0uONI
```

**Important:** Make sure the `.env` file is in the root directory (same level as `package.json`).

## Database Migration

Run the migration to create the `user_profiles` table in your Supabase database:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of: `supabase/migrations/20250105000000_create_user_profiles_table.sql`
4. Click **Run** to execute the migration

**Note:** The migration is idempotent - it can be run multiple times safely. If policies or triggers already exist, they will be dropped and recreated.

Alternatively, if you're using Supabase CLI:
```bash
supabase db push
```

## Features Implemented

### 1. Authentication Pages
- **Sign In** (`/signin`) - User login page
- **Sign Up** (`/signup`) - User registration page
- **Profile** (`/profile`) - User profile management page (protected route)

### 2. Authentication Context
- Global authentication state management
- Automatic session persistence
- User profile management
- Sign in, sign up, and sign out functionality

### 3. Protected Routes
- Profile page is protected and requires authentication
- Automatic redirect to sign-in page if not authenticated

### 4. Navigation Updates
- Sign In/Sign Up buttons when user is not logged in
- User menu with profile and sign out options when logged in
- Responsive design for mobile and desktop

## Usage

### For Users

1. **Sign Up**: Navigate to `/signup` to create a new account
2. **Sign In**: Navigate to `/signin` to log in to your account
3. **Profile**: Once logged in, access your profile at `/profile`
4. **Sign Out**: Click the user menu in the navbar and select "Sign Out"

### For Developers

The authentication system uses React Context API for state management:

```typescript
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, profile, loading, signOut } = useAuth();
  
  // Use authentication state
}
```

## Security Features

- Row Level Security (RLS) enabled on `user_profiles` table
- Users can only view and update their own profiles
- Secure password authentication via Supabase Auth
- Automatic profile creation on sign up

## Troubleshooting

### Environment Variables Not Loading
- Make sure the `.env` file is in the root directory
- Restart your development server after creating/modifying `.env`
- Check that variable names start with `VITE_`

### Database Errors

#### Policy Already Exists Error
If you see an error like "policy already exists", the migration has been updated to handle this. Simply run the migration again - it will automatically drop and recreate the policies.

#### Other Database Errors
- Ensure the migration has been run completely
- Check that RLS policies are correctly set up in Supabase Dashboard > Authentication > Policies
- Verify your Supabase project URL and keys are correct
- Check the Supabase logs for detailed error messages

### Authentication Not Working
- Check browser console for errors
- Verify Supabase project is active
- Ensure email confirmation is not required (or check your email)

## Next Steps

After setting up authentication, you can:
- Customize the profile page with additional fields
- Add more protected routes as needed
- Implement role-based access control
- Add social authentication (Google, GitHub, etc.)

