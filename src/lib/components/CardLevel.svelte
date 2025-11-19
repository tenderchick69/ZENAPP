<script lang="ts">
  export let level: number = 0; // 0-4 only
  const backgrounds = [
    'bg-[#fffff0]', // cream + dew
    'bg-[#fff8e6]',
    'bg-[#fff2e6]',
    'bg-[#f0fdf4]',
    'bg-[#ecfdf5] shadow-glow' // final before mastery
  ];
</script>

<div class="card level-{level} {backgrounds[level]}">
  <slot />
</div>

<style>
  @reference "../../app.css";

  .card {
    @apply rounded-3xl p-12 shadow-2xl transition-all duration-1000 relative overflow-hidden;
  }
  .level-0::before { content: '💧'; @apply absolute top-4 right-8 text-6xl opacity-20; }
  .shadow-glow { box-shadow: 0 0 60px rgba(34,197,94,0.5); }
</style>
