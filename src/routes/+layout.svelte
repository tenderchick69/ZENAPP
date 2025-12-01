<script>
  import { onMount } from 'svelte';
  import '../app.css';
  import { theme, t } from '$lib/theme';
  import { helpMode } from '$lib/tooltip';
  import { initAuth, user, userPreferences, authInitialized, signInWithGoogle, signOut } from '$lib/auth';
  import Onboarding from '../components/Onboarding.svelte';

  let showOnboarding = false;
  let hasCheckedOnboarding = false;

  // Only show onboarding ONCE for new users (when preferences don't exist at all)
  // IMPORTANT: Wait for authInitialized to be true before checking, to avoid race condition
  $: {
    console.log('🎯 [ONBOARDING] Reactive check triggered');
    console.log('   authInitialized:', $authInitialized);
    console.log('   User ID:', $user?.id);
    console.log('   Preferences:', $userPreferences);
    console.log('   hasCheckedOnboarding:', hasCheckedOnboarding);

    // Only check AFTER auth is fully initialized (preferences loaded)
    if ($authInitialized && !hasCheckedOnboarding) {
      if ($user && $userPreferences === null) {
        console.log('✅ [ONBOARDING] Showing onboarding modal (new user)');
        showOnboarding = true;
      } else if ($userPreferences !== null) {
        console.log('✅ [ONBOARDING] User has preferences, hiding onboarding');
      }
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
  <!-- Google Fonts: Syndicate (Orbitron, Share Tech Mono), Zen (Inter), Ember (Cormorant Garamond), Frost (Caveat, Patrick Hand), Void (Space Grotesk) -->
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@400;600&family=Cormorant+Garamond:wght@300;400;600&family=Caveat:wght@700&family=Patrick+Hand&family=Space+Grotesk:wght@300;400;500&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen neural-grid scanline relative transition-colors duration-500">
  <!-- Header -->
  <header class="header-bar relative z-10 px-6 flex justify-between items-center border-b border-accent/20 backdrop-blur-sm">
    <a href="/" class="header-title cursor-pointer hover:opacity-80 transition-opacity flex items-center">
      <span class="text-accent header-title-main">{$t.title_1}</span>
      <span class="text-danger header-title-sub">{$t.title_2}</span>
    </a>

    <div class="flex items-center gap-3" style="min-width: 200px; justify-content: flex-end;">
      <!-- HELP MODE TOGGLE -->
      <button
        onclick={() => helpMode.update(v => !v)}
        class="w-8 h-8 flex items-center justify-center border text-xs font-mono rounded-full transition-all cursor-pointer
        {$helpMode ? 'bg-accent text-bg border-accent' : 'border-dim text-dim hover:border-accent hover:text-accent'}">
        ?
      </button>

      <!-- THEME TOGGLE - 3 letter abbreviation, fixed width -->
      <button
        onclick={toggleTheme}
        class="px-3 py-1 border border-dim text-xs font-body hover:border-accent hover:text-accent transition-all uppercase cursor-pointer select-none"
        style="min-width: 60px; text-align: center;">
        {$theme === 'syndicate' ? 'SYN' : $theme === 'zen' ? 'ZEN' : $theme === 'ember' ? 'EMB' : 'FRO'}
      </button>

      <!-- AUTH: User Menu or Sign In -->
      {#if $user}
        <div class="user-menu">
          <img src={$user.user_metadata.avatar_url} alt="avatar" class="avatar" style="width: 32px; height: 32px; flex-shrink: 0;" />
          <button onclick={signOut} class="sign-out-btn" title="Sign Out" style="width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center; font-size: 16px;">
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
