<script>
  import { onMount } from 'svelte';
  import '../app.css';
  import { theme, t } from '$lib/theme';
  import { helpMode } from '$lib/tooltip';
  import { initAuth, user, userPreferences, signInWithGoogle, signOut } from '$lib/auth';
  import Onboarding from '../components/Onboarding.svelte';

  let showOnboarding = false;
  let hasCheckedOnboarding = false;

  // Only show onboarding ONCE for new users (when preferences don't exist at all)
  $: {
    console.log('🎯 [ONBOARDING] Reactive check triggered');
    console.log('   User ID:', $user?.id);
    console.log('   Preferences:', $userPreferences);
    console.log('   hasCheckedOnboarding:', hasCheckedOnboarding);
    console.log('   showOnboarding:', showOnboarding);

    if ($user && $userPreferences === null && !hasCheckedOnboarding) {
      console.log('✅ [ONBOARDING] Showing onboarding modal (new user)');
      showOnboarding = true;
      hasCheckedOnboarding = true;
    } else if ($userPreferences !== null && !hasCheckedOnboarding) {
      console.log('✅ [ONBOARDING] User has preferences, hiding onboarding');
      // User has preferences, never show onboarding
      hasCheckedOnboarding = true;
    }
  }

  onMount(async () => {
    await initAuth();
  });

  function toggleTheme() {
    theme.update(current => {
      if (current === 'syndicate') return 'zen';
      if (current === 'zen') return 'ember';
      if (current === 'ember') return 'frost';
      return 'syndicate';
    });
  }

  function handleOnboardingComplete() {
    showOnboarding = false;
  }
</script>

<svelte:head>
  <!-- Google Fonts: Syndicate (Orbitron, Share Tech Mono), Zen (Inter), Ember (Cormorant Garamond), Frost (Caveat, Patrick Hand) -->
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@400;600&family=Cormorant+Garamond:wght@300;400;600&family=Caveat:wght@700&family=Patrick+Hand&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen neural-grid scanline relative transition-colors duration-500">
  <!-- Header -->
  <header class="header-bar relative z-10 px-6 flex justify-between items-center border-b border-accent/20 backdrop-blur-sm">
    <a href="/" class="header-title cursor-pointer hover:opacity-80 transition-opacity flex items-center">
      <span class="text-accent header-title-main">{$t.title_1}</span>
      <span class="text-danger header-title-sub">{$t.title_2}</span>
    </a>

    <div class="flex items-center gap-3">
      <!-- HELP MODE TOGGLE -->
      <button
        onclick={() => helpMode.update(v => !v)}
        class="w-6 h-6 flex items-center justify-center border text-xs font-mono rounded-full transition-all cursor-pointer
        {$helpMode ? 'bg-accent text-bg border-accent' : 'border-dim text-dim hover:border-accent hover:text-accent'}">
        ?
      </button>

      <!-- THEME TOGGLE (Now cycles 3 modes) -->
      <button
        onclick={toggleTheme}
        class="px-3 py-1 border border-dim text-xs font-body hover:border-accent hover:text-accent transition-all uppercase cursor-pointer select-none">
        MODE: {$theme}
      </button>

      <!-- AUTH: User Menu or Sign In -->
      {#if $user}
        <div class="user-menu">
          <img src={$user.user_metadata.avatar_url} alt="avatar" class="avatar" style="width: 32px; height: 32px; flex-shrink: 0;" />
          <span class="user-name" style="font-size: 14px; line-height: 1.2;">{$user.user_metadata.name}</span>
          <button onclick={signOut} class="sign-out-btn">Sign Out</button>
        </div>
      {:else}
        <button onclick={signInWithGoogle} class="sign-in-btn">
          Sign in with Google
        </button>
      {/if}
    </div>
  </header>

  <main class="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
    <slot />
  </main>

  <!-- Onboarding Modal -->
  {#if showOnboarding}
    <Onboarding onComplete={handleOnboardingComplete} />
  {/if}
</div>

<style>
  .user-menu {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .avatar {
    width: 32px !important;
    height: 32px !important;
    border-radius: 50%;
    border: 2px solid var(--color-accent);
    flex-shrink: 0;
  }

  .user-name {
    font-size: 14px !important;
    line-height: 1.2 !important;
    color: var(--color-main);
    display: none;
    white-space: nowrap;
  }

  @media (min-width: 768px) {
    .user-name {
      display: block;
    }
  }

  .sign-out-btn {
    padding: 0.5rem 1rem;
    background: transparent;
    border: 1px solid var(--color-dim);
    color: var(--color-dim);
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .sign-out-btn:hover {
    border-color: var(--color-danger);
    color: var(--color-danger);
  }

  .sign-in-btn {
    padding: 0.5rem 1rem;
    background: var(--color-accent);
    color: var(--color-bg);
    border: none;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .sign-in-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px var(--color-accent);
  }
</style>
