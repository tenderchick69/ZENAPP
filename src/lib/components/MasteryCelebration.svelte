<script lang="ts">
  export let active = false;

  $: if (active) {
    const audio = new Audio('/gong.mp3');
    audio.volume = 0.4;
    audio.play();
  }
</script>

{#if active}
  <div class="fixed inset-0 pointer-events-none z-50">
    <div class="absolute top-1/3 left-1/2 -translate-x-1/2 animate-fall">
      <svg class="w-32 h-32 text-accent opacity-80"><use href="/icons.svg#leaf"/></svg>
    </div>
  </div>
{/if}

<style>
  @keyframes fall {
    0% { transform: translateY(-100vh) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
  .animate-fall { animation: fall 3s ease-in forwards; }
</style>
