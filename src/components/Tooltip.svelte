<script lang="ts">
  import { fade } from 'svelte/transition';
  import { helpMode } from '$lib/tooltip';
  import { theme } from '$lib/theme';

  export let text = '';
  let hovered = false;
</script>

<div
  class="relative inline-block w-full"
  onmouseenter={() => hovered = true}
  onmouseleave={() => hovered = false}
  role="group"
>
  <slot />

  {#if $helpMode && hovered}
    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 z-50 pointer-events-none
      {$theme === 'ember' ? 'bg-[#1a1a1a] border border-orange-500/50 text-orange-100' :
       $theme === 'zen' ? 'bg-white border border-gray-200 text-gray-800 shadow-xl' :
       'bg-black border border-cyan-500 text-cyan-100'}
      p-3 text-xs font-sans text-center rounded shadow-lg backdrop-blur-md"
      transition:fade={{ duration: 150 }}
    >
      {text}
      <!-- Arrow -->
      <div class="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent
        {$theme === 'ember' ? 'border-t-orange-500/50' :
         $theme === 'zen' ? 'border-t-white' : 'border-t-cyan-500'}">
      </div>
    </div>
  {/if}
</div>
