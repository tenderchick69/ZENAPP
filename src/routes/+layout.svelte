<script lang="ts">
  import '../app.css';
  import { currentSkin, toggleSkin } from '$lib/theme';
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Noto+Serif+JP:wght@400;700&family=Shippori+Mincho:wght@400;700&display=swap" rel="stylesheet">
</svelte:head>

{#if $currentSkin === 'syndicate'}
  <!-- ═══════════════════════════════════════════════════════════════
       SYNDICATE SKIN (Cyberpunk)
       ═══════════════════════════════════════════════════════════════ -->
  <div class="min-h-screen neural-grid scanline relative overflow-x-hidden bg-wet-dark text-gray-200 selection:bg-neon-cyan selection:text-black">

    <!-- Ambient Glow -->
    <div class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[100px] bg-neon-cyan/5 pointer-events-none"></div>

    <!-- Decorative Drips -->
    <div class="fixed top-0 left-10 w-[1px] h-32 bg-gradient-to-b from-neon-red to-transparent opacity-50 animate-drip"></div>
    <div class="fixed top-0 right-20 w-[1px] h-48 bg-gradient-to-b from-neon-red to-transparent opacity-30 animate-drip" style="animation-delay: 1s"></div>

    <!-- Header -->
    <header class="relative z-10 p-6 flex justify-between items-center border-b border-neon-cyan/20 backdrop-blur-sm">
      <div class="font-cyber text-xl tracking-widest cursor-default">
        <span class="text-neon-cyan animate-flicker text-glow">VOCAPP</span>
        <span class="text-neon-red ml-2">SYNDICATE</span>
      </div>
      <div class="flex items-center gap-4">
        <button
          onclick={toggleSkin}
          class="text-xs text-neon-cyan/50 hover:text-neon-cyan border border-neon-cyan/30 px-3 py-1 hover:border-neon-cyan transition-all font-mono"
        >
          [ ZEN MODE ]
        </button>
        <div class="text-xs text-neon-cyan/50">v.2087.1</div>
      </div>
    </header>

    <main class="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="relative z-10 p-6 text-center text-xs text-gray-600 border-t border-neon-cyan/10 mt-auto">
      NEURAL INTERFACE ACTIVE // UNTRACEABLE
    </footer>
  </div>

{:else}
  <!-- ═══════════════════════════════════════════════════════════════
       ZEN SKIN (Brutalist Monochrome)
       ═══════════════════════════════════════════════════════════════ -->
  <div class="min-h-screen zen-grain relative overflow-x-hidden bg-void text-paper selection:bg-blood selection:text-paper">

    <!-- Header -->
    <header class="relative z-10 p-8 flex justify-between items-center border-b border-stone/10">
      <div class="font-zen-display text-xl tracking-[0.3em] cursor-default uppercase">
        <span class="text-paper">語</span>
        <span class="text-stone/50 ml-4 text-sm tracking-widest">vocapp</span>
      </div>
      <div class="flex items-center gap-6">
        <button
          onclick={toggleSkin}
          class="text-xs text-stone/50 hover:text-paper border border-stone/20 px-3 py-1 hover:border-paper transition-all duration-500 font-zen tracking-widest"
        >
          SYNDICATE
        </button>
      </div>
    </header>

    <main class="relative z-10 w-full max-w-3xl mx-auto px-8 py-16 flex flex-col gap-12">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="relative z-10 p-8 text-center text-xs text-stone/30 border-t border-stone/5 mt-auto font-zen tracking-widest">
      一期一会
    </footer>
  </div>
{/if}
