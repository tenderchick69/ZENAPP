<script>
  import '../app.css';
</script>

<svelte:head>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen neural-grid scanline relative overflow-x-hidden selection:bg-neon-cyan selection:text-black">

  <!-- Ambient Glow Following Cursor (Simplified fixed position for now) -->
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
    <div class="text-xs text-neon-cyan/50">v.2087.1</div>
  </header>

  <main class="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col gap-8">
    <slot />
  </main>

  <!-- Footer -->
  <footer class="relative z-10 p-6 text-center text-xs text-gray-600 border-t border-neon-cyan/10 mt-auto">
    NEURAL INTERFACE ACTIVE // UNTRACEABLE
  </footer>
</div>
