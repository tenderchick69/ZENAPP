# ZENAPP - Technical Stack & Setup Guide

## 📦 Dependencies

### Frontend Framework
```json
{
  "@sveltejs/kit": "^2.47.1",
  "svelte": "^5.41.0"
}
```
- **SvelteKit**: Modern meta-framework for Svelte
- **Svelte 5**: Latest version with Runes reactivity system

### Build Tools & Adapters
```json
{
  "@sveltejs/adapter-vercel": "^6.1.2",
  "@sveltejs/vite-plugin-svelte": "^6.2.1",
  "vite": "^7.1.10",
  "typescript": "^5.9.3"
}
```
- **Vercel Adapter**: Optimized for Vercel deployment
- **Vite**: Lightning-fast build tool
- **TypeScript**: Type safety

### Styling
```json
{
  "tailwindcss": "^4.1.17",
  "@tailwindcss/postcss": "^4.1.17",
  "autoprefixer": "^10.4.22",
  "postcss": "^8.5.6"
}
```
- **Tailwind CSS v4**: Latest utility-first CSS framework
- **PostCSS**: CSS processing

### Database & Auth
```json
{
  "@supabase/supabase-js": "^2.83.0"
}
```
- **Supabase Client**: PostgreSQL + Auth + Realtime
- **Authentication**: Google OAuth
- **Database**: PostgreSQL with Row Level Security

### Utilities
```json
{
  "papaparse": "^5.5.3",
  "@types/papaparse": "^5.5.0",
  "uuid": "^13.0.0"
}
```
- **PapaParse**: CSV parsing for deck import
- **UUID**: Unique ID generation

### Desktop (Installed, Not Implemented)
```json
{
  "@tauri-apps/api": "^2.9.0",
  "@tauri-apps/cli": "^2.9.4"
}
```
- **Tauri**: For future desktop app version
- **Not currently used**

---

## 🔧 Development Setup

### Prerequisites
- **Node.js**: v18+ recommended
- **pnpm**: v8+ (faster than npm)
- **Git**: For version control

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone https://github.com/yourusername/zenapp.git
   cd zenapp
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```

   **Edit `.env` with your keys:**
   ```bash
   # OpenRouter API (for AI generation)
   OPENROUTER_API_KEY=sk-or-v1-...

   # Admin Password (for AI access control)
   ADMIN_PASSWORD=your-secret-password

   # Supabase (for database & auth)
   PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

   Server runs at: `http://localhost:5173`

---

## 🔑 Getting API Keys

### 1. OpenRouter API Key

**Purpose**: AI deck generation

**Steps**:
1. Go to https://openrouter.ai
2. Sign up / Log in
3. Navigate to "API Keys"
4. Create new key
5. Copy key (starts with `sk-or-v1-`)

**Cost**: Pay-as-you-go
- KIMI K2: ~$0.0003 per deck
- ~$0.30 for 1000 decks

**Free Credits**: New accounts get $5 free credit

### 2. Supabase

**Purpose**: Database + Authentication

**Steps**:
1. Go to https://supabase.com
2. Create account
3. Create new project
4. Go to Project Settings → API
5. Copy:
   - **URL**: `https://your-project.supabase.co`
   - **Anon Key**: Public key (safe for client-side)

**Database Setup**:
Run this SQL in Supabase SQL Editor:

```sql
-- Create decks table
CREATE TABLE decks (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create cards table
CREATE TABLE cards (
  id BIGSERIAL PRIMARY KEY,
  deck_id BIGINT REFERENCES decks(id) ON DELETE CASCADE,

  headword TEXT NOT NULL,
  definition TEXT NOT NULL,
  pos TEXT,
  ipa TEXT,
  example TEXT,
  example_gloss TEXT,

  synonyms TEXT,
  gloss_de TEXT,
  etymology TEXT,
  mnemonic TEXT,
  tags TEXT,
  freq INTEGER DEFAULT 0,

  state INTEGER DEFAULT 0,
  interval INTEGER DEFAULT 0,
  due TIMESTAMP DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  native_language TEXT,
  target_language TEXT,
  experience_level TEXT,
  theme TEXT,
  is_approved BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all authenticated users for now)
CREATE POLICY "Allow all for authenticated users" ON decks
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON cards
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid()::text = id);
```

**Google OAuth Setup**:
1. In Supabase Dashboard → Authentication → Providers
2. Enable "Google"
3. Follow instructions to get Google OAuth credentials
4. Add credentials to Supabase
5. Add redirect URL: `http://localhost:5173` (for dev)

### 3. Admin Password

**Purpose**: Control access to AI generation

**Steps**:
1. Choose a secure password
2. Add to `.env`:
   ```bash
   ADMIN_PASSWORD=your-secret-password-123
   ```
3. Share with approved users

**Note**: Users only need this ONCE per account

---

## 🏗️ Build & Deployment

### Local Build
```bash
pnpm build
```

Outputs to: `.svelte-kit/output`

### Preview Build
```bash
pnpm preview
```

Runs production build locally

### Type Checking
```bash
pnpm check
```

Checks TypeScript + Svelte types

---

## 🚀 Vercel Deployment

### Automatic Deployment

1. **Connect GitHub**
   - Push code to GitHub
   - Go to https://vercel.com
   - Import your GitHub repo

2. **Configure Environment Variables**
   In Vercel Dashboard → Settings → Environment Variables:
   ```
   OPENROUTER_API_KEY = sk-or-v1-...
   ADMIN_PASSWORD = your-secret-password
   PUBLIC_SUPABASE_URL = https://your-project.supabase.co
   PUBLIC_SUPABASE_ANON_KEY = your-anon-key
   ```

3. **Deploy**
   - Push to `main` branch
   - Vercel auto-builds and deploys
   - Live at: `https://your-project.vercel.app`

### Build Configuration

**Vercel automatically detects SvelteKit projects**

**Manual config** (if needed):
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".svelte-kit/output",
  "installCommand": "pnpm install",
  "framework": "sveltekit"
}
```

---

## 🧪 Testing

### Manual Testing Checklist

**Authentication**:
- [ ] Sign in with Google works
- [ ] User preferences saved
- [ ] Sign out works

**Themes**:
- [ ] Syndicate theme renders correctly
- [ ] Zen theme renders correctly
- [ ] Ember theme renders correctly
- [ ] Frost theme renders correctly
- [ ] Theme switching works
- [ ] Theme persists after refresh

**AI Generation**:
- [ ] Quick Generate works (requires OPENROUTER_API_KEY)
- [ ] Chat Mode works
- [ ] Preview shows cards
- [ ] Regenerate works
- [ ] Add to Collection saves to database

**Study**:
- [ ] Standard mode shows due cards
- [ ] Grading updates SRS state
- [ ] Session stats track correctly
- [ ] Card editing works
- [ ] TTS pronunciation works

**Import**:
- [ ] CSV upload works
- [ ] Column mapping works
- [ ] Deck created successfully

**Responsive**:
- [ ] Mobile view (< 768px)
- [ ] Tablet view (768-1024px)
- [ ] Desktop view (> 1024px)

---

## 🐛 Troubleshooting

### "Supabase client not initialized"
- **Cause**: Missing environment variables
- **Fix**: Check `.env` has `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
- **Restart**: Dev server after adding env vars

### "OpenRouter API error"
- **Cause**: Invalid or missing API key
- **Fix**: Verify `OPENROUTER_API_KEY` in `.env`
- **Check**: Key starts with `sk-or-v1-`
- **Balance**: Ensure you have credits at https://openrouter.ai

### "Admin code invalid"
- **Cause**: Wrong password or not set
- **Fix**: Verify `ADMIN_PASSWORD` in `.env` matches what user entered
- **Restart**: Server after changing env var

### Database connection fails
- **Cause**: Wrong Supabase URL or key
- **Fix**: Double-check credentials from Supabase dashboard
- **Note**: Use `PUBLIC_SUPABASE_ANON_KEY` (not service key)

### Google OAuth redirect fails
- **Cause**: Redirect URL not configured
- **Fix**: Add your URL to Supabase Google provider settings
- **Dev**: `http://localhost:5173`
- **Prod**: `https://your-domain.vercel.app`

### Build fails on Vercel
- **Cause**: Missing environment variables
- **Fix**: Add all env vars in Vercel dashboard
- **Redeploy**: After adding vars

---

## 📚 Key Files Reference

### Configuration Files

**`svelte.config.js`**
- SvelteKit configuration
- Adapter settings (Vercel)
- Preprocessors

**`vite.config.ts`**
- Vite build configuration
- Plugins
- Server settings

**`tailwind.config.js`**
- Tailwind CSS configuration
- Custom theme extensions
- Plugins

**`tsconfig.json`**
- TypeScript configuration
- Path aliases
- Compiler options

**`package.json`**
- Dependencies
- Scripts
- Project metadata

### Environment Files

**`.env`** (Create from `.env.example`)
```bash
# AI Generation
OPENROUTER_API_KEY=sk-or-v1-...

# Admin Access Control
ADMIN_PASSWORD=secret-password

# Database & Auth (Public)
PUBLIC_SUPABASE_URL=https://project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**`.env.example`** (Template for `.env`)
- Commit to repo
- Has placeholders, not real values

---

## 🔒 Security Best Practices

### Environment Variables

**Server-Side Only** (Hidden from client):
- `OPENROUTER_API_KEY`
- `ADMIN_PASSWORD`

**Client-Side (Public OK)**:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

**Rule**: Only `PUBLIC_*` vars are exposed to browser

### API Key Security

**Never**:
- Commit `.env` to git
- Share API keys publicly
- Use service role key in client code

**Always**:
- Use `.env.example` as template
- Add `.env` to `.gitignore`
- Rotate keys if exposed

### Supabase Row Level Security

**Enable RLS** on all tables:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

**Create policies** to restrict access:
```sql
CREATE POLICY "policy_name" ON table_name
  FOR ALL
  USING (auth.uid()::text = user_id);
```

---

## 📊 Performance

### Build Optimization

**Vite**:
- Fast HMR (Hot Module Replacement)
- Tree-shaking
- Code splitting

**SvelteKit**:
- Server-side rendering (SSR)
- Static site generation (SSG)
- Automatic code splitting

**Vercel**:
- Edge network (global CDN)
- Automatic compression
- Image optimization

### Bundle Size

**Current** (~estimate):
- JS: ~150 KB (compressed)
- CSS: ~20 KB (compressed)
- Fonts: Loaded from Google Fonts CDN

**Optimizations**:
- Dynamic imports for theme-specific components
- Lazy loading for AI Chat component
- Minimal dependencies

---

## 🔄 Update Dependencies

### Check for Updates
```bash
pnpm outdated
```

### Update All
```bash
pnpm update
```

### Update Specific Package
```bash
pnpm update package-name
```

### Update to Latest Major
```bash
pnpm update package-name@latest
```

---

## 📖 Useful Commands

### Development
```bash
pnpm dev            # Start dev server
pnpm dev --host     # Expose to network
pnpm dev --port 3000  # Custom port
```

### Build
```bash
pnpm build          # Production build
pnpm preview        # Preview production build
pnpm check          # Type check
```

### Cleanup
```bash
rm -rf node_modules .svelte-kit
pnpm install        # Fresh install
```

### Git
```bash
git add .
git commit -m "message"
git push
```

---

## 🆘 Getting Help

### Documentation
- **SvelteKit**: https://kit.svelte.dev/docs
- **Svelte 5**: https://svelte-5-preview.vercel.app
- **Tailwind v4**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **OpenRouter**: https://openrouter.ai/docs

### Community
- **Svelte Discord**: https://svelte.dev/chat
- **Supabase Discord**: https://discord.supabase.com

### Issues
- **Create Issue**: GitHub repository issues page
- **Include**: Error message, steps to reproduce, environment details

---

## 📝 Development Tips

### Code Style
- Use **Svelte 5 Runes** (`$state`, `$derived`, `$effect`)
- Use **TypeScript** for all data structures
- Use **Tailwind** for styling (avoid inline styles when possible)
- Use **CSS Variables** for theme-specific values

### File Organization
- **Routes**: Pages and API endpoints (`src/routes/`)
- **Components**: Reusable UI (`src/components/`)
- **Lib**: Utilities and logic (`src/lib/`)
- **Types**: Shared in `src/lib/` files

### Best Practices
- Test all 4 themes when making UI changes
- Check mobile responsiveness
- Validate TypeScript types (`pnpm check`)
- Test with real Supabase data
- Keep functions small and focused

---

**Last Updated**: 2025-01-30
**Version**: 0.0.1
