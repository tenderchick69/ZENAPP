<script>
  import { onMount, onDestroy } from 'svelte';
  import '../app.css';
  import { theme, t, helpMode } from '$lib/theme';
  import { initAuth, cleanupAuth, user, userPreferences, authInitialized, signInWithGoogle, signOut } from '$lib/auth';
  import Onboarding from '../components/Onboarding.svelte';

  let showOnboarding = false;
  let hasCheckedOnboarding = false;

  // Only show onboarding ONCE for new users (when preferences don't exist at all)
  // IMPORTANT: Wait for authInitialized to be true before checking, to avoid race condition
  $: {
    if ($authInitialized && !hasCheckedOnboarding) {
      if ($user && $userPreferences === null) {
        showOnboarding = true;
      }
      hasCheckedOnboarding = true;
    }
  }

  onMount(async () => {
    await initAuth();
  });

  onDestroy(() => {
    cleanupAuth();
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
  <!-- iOS Status Bar Theme Color - matches each theme's background -->
  {#if $theme === 'syndicate'}
    <meta name="theme-color" content="#000000">
  {:else if $theme === 'zen'}
    <meta name="theme-color" content="#1a1a1a">
  {:else if $theme === 'ember'}
    <meta name="theme-color" content="#1a0a0a">
  {:else if $theme === 'frost'}
    <meta name="theme-color" content="#1a2a3a">
  {/if}
  <!-- Google Fonts: Syndicate (Orbitron, Share Tech Mono), Zen (Inter), Ember (Cormorant Garamond), Frost (Caveat, Patrick Hand), Void (Space Grotesk) -->
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@400;600&family=Cormorant+Garamond:wght@300;400;600&family=Caveat:wght@700&family=Patrick+Hand&family=Space+Grotesk:wght@300;400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen neural-grid scanline relative transition-colors duration-500 overflow-x-hidden">
  <!-- Header -->
  <header class="header-bar relative z-10 px-3 md:px-6 flex justify-between items-center border-b border-accent/20 backdrop-blur-sm">
    <a href="/" class="header-title cursor-pointer hover:opacity-80 transition-opacity flex items-center">
      <span class="text-accent header-title-main">{$t.title_1}</span>
      <span class="text-danger header-title-sub">{$t.title_2}</span>
    </a>

    <div class="flex items-center gap-2 md:gap-3" style="justify-content: flex-end;">
      <!-- HELP MODE TOGGLE - Desktop only (hover tooltips don't work on touch) -->
      <button
        onclick={() => helpMode.update(v => !v)}
        class="hidden md:flex w-8 h-8 items-center justify-center border text-sm font-body transition-all cursor-pointer select-none rounded-full
          {$helpMode ? 'border-accent text-accent bg-accent/10' : 'border-dim text-dim hover:border-accent hover:text-accent'}"
        title={$helpMode ? 'Disable help tooltips' : 'Enable help tooltips'}>
        ?
      </button>

      <!-- THEME TOGGLE - 3 letter abbreviation, 44px touch target on mobile -->
      <button
        onclick={toggleTheme}
        class="px-3 py-2 md:py-1 min-h-[44px] md:min-h-0 border border-dim text-xs font-body hover:border-accent hover:text-accent transition-all uppercase cursor-pointer select-none"
        style="min-width: 60px; text-align: center;">
        {$theme === 'syndicate' ? 'SYN' : $theme === 'zen' ? 'ZEN' : $theme === 'ember' ? 'EMB' : 'FRO'}
      </button>

      <!-- AUTH: User Menu or Sign In -->
      {#if $user}
        <div class="user-menu">
          {#if $user.user_metadata?.avatar_url}
            <img src={$user.user_metadata.avatar_url} alt="avatar" class="avatar" />
          {:else}
            <div class="avatar avatar-fallback">
              {($user.email || $user.user_metadata?.name || '?').charAt(0).toUpperCase()}
            </div>
          {/if}
          <button onclick={signOut} class="sign-out-btn" title="Sign Out">
            ⏻
          </button>
        </div>
      {:else}
        <button onclick={signInWithGoogle} class="sign-in-btn">
          Sign in
        </button>
      {/if}
    </div>
  </header>

  <main class="relative z-10 w-full px-6 py-12 flex flex-col gap-8">
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
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 2px solid var(--color-accent);
    flex-shrink: 0;
  }

  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent);
    color: var(--color-bg);
    font-weight: 600;
    font-size: 14px;
  }

  @media (min-width: 768px) {
    .avatar {
      width: 32px;
      height: 32px;
    }
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
    /* 44px touch target on mobile */
    width: 44px;
    height: 44px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--color-dim);
    color: var(--color-dim);
    border-radius: 50%;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
  }

  @media (min-width: 768px) {
    .sign-out-btn {
      width: 32px;
      height: 32px;
      font-size: 16px;
    }
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
