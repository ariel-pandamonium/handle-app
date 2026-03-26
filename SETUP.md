# Handle. — Setup Instructions

Follow these steps in order. You only need to do this once.

---

## Step 1: Install Node.js (if you don't have it)

1. Go to https://nodejs.org
2. Download the **LTS** version (the one that says "Recommended")
3. Run the installer, accept all defaults
4. To verify it worked: open a terminal/command prompt and type `node --version` — you should see a version number

---

## Step 2: Set up the database in Supabase

1. Go to https://supabase.com and open your Handle. project
2. In the left sidebar, click the **SQL Editor** icon (it looks like a document with `<>` on it)
3. Click **New query**
4. Open the file `supabase-schema.sql` from this folder in any text editor (Notepad works fine)
5. Select ALL the text (Ctrl+A) and copy it (Ctrl+C)
6. Paste it into the SQL Editor in Supabase (Ctrl+V)
7. Click the green **Run** button
8. You should see "Success. No rows returned" — that means it worked!

This creates all the tables Handle. needs: plates, projects, tasks, drop_items, and user_preferences. It also sets up security rules and a trigger that automatically creates your 8 default plates when you sign up.

---

## Step 3: Enable email auth in Supabase

1. In your Supabase project, go to **Authentication** in the left sidebar
2. Click **Providers**
3. Make sure **Email** is enabled (it usually is by default)
4. For testing, go to **Authentication > Settings** and turn OFF "Confirm email" — this lets you sign up without needing to click a confirmation link. You can turn it back on later.

---

## Step 4: Install the app and run it

1. Open a terminal/command prompt
2. Navigate to this folder. On Windows, that would be something like:
   ```
   cd "C:\Users\ariel\OneDrive\!CLAUDE\Project - Handle. App Development\handle-app"
   ```
3. Install all the app's dependencies (this downloads the libraries the app needs):
   ```
   npm install
   ```
4. Start the app:
   ```
   npm run dev
   ```
5. Open your browser and go to: **http://localhost:3000**
6. You should see the Handle. login screen!

---

## Step 5: Create your account

1. On the login screen, click "Don't have an account? Create one"
2. Enter your email and a password (minimum 6 characters)
3. Click "Create Account"
4. If you disabled email confirmation in Step 3, you'll be logged in immediately
5. You should see the dashboard with your 8 default plates!

---

## What you should see

After completing all steps, you should see:
- A clean login page with the Handle. logo
- After signing in: a dashboard showing all 8 plates in a grid
- The Architecture plate should be larger, spanning the full width
- A small status bar at the bottom confirming you're connected

If something goes wrong, tell me the error message and I'll help you fix it.
