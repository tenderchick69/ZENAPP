<script lang="ts">
  import { page } from '$app/stores';
  import { theme, t } from '$lib/theme';
</script>

<div class="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
  <div class="max-w-md space-y-8">
    <!-- Error Code -->
    <div>
      <h1 class="text-9xl font-heading text-danger tracking-wider animate-pulse mb-4">
        {$page.status || 404}
      </h1>

      {#if $theme === 'ember'}
        <p class="text-3xl font-ember text-orange-100/70 mb-2">
          The Garden Has Withered
        </p>
        <p class="text-sm text-orange-300/50 font-light">
          This path leads nowhere. Return to the hearth.
        </p>
      {:else if $theme === 'frost'}
        <p class="text-3xl font-hand text-[#a8d8ea]/70 mb-2">
          The Glass Has Shattered
        </p>
        <p class="text-sm text-white/50 font-hand">
          This window shows nothing. Step back inside.
        </p>
      {:else if $theme === 'zen'}
        <p class="text-3xl font-body text-main/70 mb-2">
          Path Not Found
        </p>
        <p class="text-sm text-dim">
          Return to center. Begin again.
        </p>
      {:else}
        <p class="text-3xl font-heading text-main/70 mb-2">
          ROUTE CORRUPTED
        </p>
        <p class="text-sm text-danger animate-flicker">
          SYSTEM BREACH DETECTED
        </p>
      {/if}
    </div>

    <!-- Error Message -->
    {#if $page.error}
      <div class="bg-panel/50 border border-danger/30 p-4 rounded-lg backdrop-blur-sm">
        <p class="text-xs font-mono text-dim">
          {$page.error.message || 'Unknown error'}
        </p>
      </div>
    {/if}

    <!-- Return Home Button -->
    <a
      href="/"
      class="inline-block px-8 py-4 bg-accent text-bg font-heading text-lg font-bold hover:shadow-[0_0_40px_currentColor/60] transition-all rounded-full cursor-pointer">
      {$theme === 'ember' ? 'Return to Hearth' : $theme === 'frost' ? 'Step Inside' : 'Return Home'}
    </a>
  </div>
</div>
