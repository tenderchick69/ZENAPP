<script>
  import '../app.css';
  import { theme, t } from '$lib/theme';
  import { helpMode } from '$lib/tooltip';

  function toggleTheme() {
    theme.update(current => {
      if (current === 'syndicate') return 'zen';
      if (current === 'zen') return 'ember';
      if (current === 'ember') return 'frost';
      return 'syndicate';
    });
  }
</script>

<svelte:head>
  <!-- Google Fonts: Syndicate (Orbitron, Share Tech Mono), Zen (Inter), Ember (Cormorant Garamond), Frost (Caveat, Patrick Hand) -->
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@400;600&family=Cormorant+Garamond:wght@300;400;600&family=Caveat:wght@700&family=Patrick+Hand&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen neural-grid scanline relative overflow-x-hidden transition-colors duration-500">
  <!-- Header -->
  <header class="relative z-10 p-6 flex justify-between items-center border-b border-accent/20 backdrop-blur-sm">
    <a href="/" class="font-heading text-xl tracking-widest cursor-pointer hover:opacity-80 transition-opacity">
      <span class="text-accent animate-flicker">{$t.title_1}</span>
      <span class="text-danger ml-2">{$t.title_2}</span>
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
    </div>
  </header>

  <main class="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
    <slot />
  </main>
</div>
