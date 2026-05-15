# Supabase Migrations

This directory contains database migrations for the Detectra AI project.

## Running Migrations

### Option 1: Supabase Dashboard (Recommended for Quick Setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of the migration file you want to run
4. Click **Run** to execute the migration

### Option 2: Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (first time only)
supabase link --project-ref txkwnceefmaotmqluajc

# Push all migrations
supabase db push

# Or push a specific migration
supabase migration up
```

## Migration Files

### 20251004150452_create_contact_submissions_table.sql
Creates the `contact_submissions` table for storing contact form submissions.

### 20250105000000_create_user_profiles_table.sql
Creates the `user_profiles` table with:
- User profile information (full_name, email, avatar_url, github_username)
- Row Level Security (RLS) policies
- Automatic timestamp updates

**Note:** This migration is idempotent - it can be run multiple times safely. It will:
- Drop existing policies if they exist before recreating them
- Drop existing triggers if they exist before recreating them
- Use `CREATE TABLE IF NOT EXISTS` to avoid errors if the table already exists

## Troubleshooting

### Error: Policy already exists
If you see an error about policies already existing, the migration has been updated to handle this automatically. Simply run the migration again - it will drop and recreate the policies.

### Error: Table already exists
The migration uses `CREATE TABLE IF NOT EXISTS`, so this should not be an issue. If you still see this error, the table structure might be different. Check your existing table structure and adjust the migration if needed.

### RLS Policies Not Working
Make sure:
1. RLS is enabled on the table: `ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;`
2. Policies are created correctly
3. You're testing with an authenticated user
4. The user's `auth.uid()` matches the profile `id`

## Verification

After running migrations, verify in Supabase Dashboard:

1. **Table Editor**: Check that `user_profiles` table exists with correct columns
2. **Authentication**: Check that users can sign up and sign in
3. **Policies**: Go to **Authentication > Policies** and verify RLS policies are active
4. **SQL Editor**: Run a test query to verify policies work:
   ```sql
   -- This should only return the current user's profile
   SELECT * FROM user_profiles;
   ```

