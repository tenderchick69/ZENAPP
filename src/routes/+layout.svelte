<script>
  import '../app.css';
  import { theme, t } from '$lib/theme';
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Inter:wght@400;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen neural-grid scanline relative overflow-x-hidden transition-colors duration-500">
  <!-- Header -->
  <header class="relative z-10 p-6 flex justify-between items-center border-b border-accent/20 backdrop-blur-sm">
    <div class="font-heading text-xl tracking-widest cursor-default">
      <span class="text-accent animate-flicker">{$t.title_1}</span>
      <span class="text-danger ml-2">{$t.title_2}</span>
    </div>

    <!-- THEME TOGGLE -->
    <button
      onclick={() => theme.update(c => c === 'syndicate' ? 'zen' : 'syndicate')}
      class="px-3 py-1 border border-dim text-xs font-body hover:border-accent hover:text-accent transition-all uppercase">
      MODE: {$theme}
    </button>
  </header>

  <main class="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
    <slot />
  </main>
</div>
