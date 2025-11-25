import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const storedTheme = browser ? localStorage.getItem('vocapp_theme') : 'syndicate';
export const theme = writable(storedTheme || 'syndicate');

if (browser) {
  theme.subscribe(val => {
    localStorage.setItem('vocapp_theme', val);
    document.body.setAttribute('data-theme', val);
  });
}

const DICTIONARY = {
  syndicate: {
    // Global
    title_1: 'VOCAPP',
    title_2: 'SYNDICATE',
    subtitle: 'Upgrade Your Wetware',

    // Home
    btn_import: 'DATA INGESTION',
    btn_ai: 'AI GENERATION OFFLINE',
    no_decks: 'NO IMPLANTS DETECTED',
    btn_seed: 'INSTALL DEMO SHARD',
    deck_sub: 'COGNITIVE SHARD',
    deck_ready: 'SYNC: READY',
    action_open: 'INITIALIZE →',

    // Import
    import_title: 'DATA INGESTION',
    import_drop: 'DROP CSV ARTIFACT HERE',
    import_uploading: 'UPLOADING WETWARE...',
    import_abort: 'ABORT SEQUENCE',

    // Lobby
    lobby_title: 'NEURAL LOBBY',
    lobby_id: 'ID',
    lobby_status: 'NET_STATUS: ONLINE',
    stat_due: 'CRITICAL',
    stat_learn: 'IN TRANSIT',
    stat_master: 'MASTERED',
    mode_std: 'STANDARD EXECUTION',
    mode_weak: 'REINFORCE WEAKNESS',
    mode_cram: 'OVERCLOCK',
    unit_cram: 'SHARDS',
    btn_exit: 'ABORT / JACK OUT',

    // Study
    lbl_mode: 'MODE',
    btn_reveal: 'DECRYPT',
    btn_fail: 'REJECT',
    btn_pass: 'INTEGRATE',
    msg_locked: 'TRAINING MODE: PROGRESS LOCKED',

    // Summary
    sum_title: 'SESSION HALTED',
    sum_good: 'INTEGRATED',
    sum_bad: 'REJECTED',

    // Graveyard
    grave_title: 'NEURAL ARCHIVE',
    grave_empty: 'ARCHIVE EMPTY. ENGAGE TRAINING.',
    grave_back: 'JACK OUT',
    grave_resurrect: 'RESURRECT',
    grave_link: 'ARCHIVED',

    // Edit & Audio
    btn_edit: 'REWRITE SHARD',
    btn_save: 'OVERWRITE',
    btn_audio: 'AUDIO_OUT',

    // Inspector
    btn_inspect: 'INSPECT NEURAL PATHWAYS',
    inspect_title: 'NEURAL MATRIX',
    col_word: 'SHARD',
    col_lvl: 'LVL',
    col_due: 'NEXT SYNC',
    btn_back: 'RETURN'
  },
  zen: {
    // Global
    title_1: 'VOCAPP',
    title_2: 'ZEN',
    subtitle: 'One Path. No Noise.',

    // Home
    btn_import: 'Import CSV',
    btn_ai: 'AI Generator (Locked)',
    no_decks: 'The garden is empty.',
    btn_seed: 'Plant First Seed',
    deck_sub: 'Vocabulary Deck',
    deck_ready: 'Study Now',
    action_open: 'Enter →',

    // Import
    import_title: 'Import Data',
    import_drop: 'Drop CSV File Here',
    import_uploading: 'Importing...',
    import_abort: 'Cancel',

    // Lobby
    lobby_title: 'Study Session',
    lobby_id: 'Deck',
    lobby_status: 'Status: Connected',
    stat_due: 'Review Due',
    stat_learn: 'Learning',
    stat_master: 'Mastered',
    mode_std: 'Regular Study',
    mode_weak: 'Practice Weakness',
    mode_cram: 'Cram Mode',
    unit_cram: 'Cards',
    btn_exit: 'Exit Session',

    // Study
    lbl_mode: 'Current Mode',
    btn_reveal: 'Reveal',
    btn_fail: 'Again',
    btn_pass: 'Good',
    msg_locked: 'Practice Mode: No Progress Saved',

    // Summary
    sum_title: 'Session Complete',
    sum_good: 'Correct',
    sum_bad: 'Reviewing',

    // Graveyard
    grave_title: 'Mastered Cards',
    grave_empty: 'No mastered cards yet. Keep studying.',
    grave_back: 'Back Home',
    grave_resurrect: 'Review Again',
    grave_link: 'Mastered',

    // Edit & Audio
    btn_edit: 'Edit',
    btn_save: 'Save',
    btn_audio: 'Listen',

    // Inspector
    btn_inspect: 'View Card List',
    inspect_title: 'Deck Inventory',
    col_word: 'Word',
    col_lvl: 'Level',
    col_due: 'Due',
    btn_back: 'Back'
  },
  ember: {
    // Global
    title_1: 'EMBER',
    title_2: 'GARDEN',
    subtitle: 'Keep the fire burning.',

    // Home
    btn_import: 'Sow Seeds',
    btn_ai: 'Spark Life',
    no_decks: 'The hearth is cold.',
    btn_seed: 'Kindle First Flame',
    deck_sub: '',
    deck_ready: 'Enter',
    action_open: 'Ignite →',

    // Import
    import_title: 'Kindle New Knowledge',
    import_drop: 'Drop Fuel Here',
    import_uploading: 'Igniting...',
    import_abort: 'Extinguish',

    // Lobby
    lobby_title: 'Hearthstone',
    lobby_id: '',
    lobby_status: '',
    stat_due: 'WILTING',
    stat_learn: 'GARDEN SIZE',
    stat_master: 'ETERNAL',
    mode_std: 'Study Due',
    mode_weak: 'Review All',
    mode_cram: 'Wildfire',
    unit_cram: 'Sparks',
    btn_exit: 'Leave Garden',

    // Study
    lbl_mode: 'Current Flame',
    btn_reveal: 'Illuminate',
    btn_fail: 'Dim',
    btn_pass: 'Brighten',
    msg_locked: 'Warmth Locked',

    // Summary
    sum_title: 'Fire Fades',
    sum_good: 'Brightened',
    sum_bad: 'Dimmed',

    // Graveyard
    grave_title: 'Golden Archive',
    grave_empty: 'No golden memories yet.',
    grave_back: 'Return to Hearth',
    grave_resurrect: 'Rekindle',
    grave_link: 'Golden',

    // Edit & Audio
    btn_edit: 'Reshape',
    btn_save: 'Forge',
    btn_audio: 'Whisper',

    // Inspector
    btn_inspect: 'View Garden',
    inspect_title: 'Memory Garden',
    col_word: 'Ember',
    col_lvl: 'Heat',
    col_due: 'Next Glow',
    btn_back: 'Return'
  },
  frost: {
    // Global
    title_1: 'FROST',
    title_2: 'GLASS',
    subtitle: 'Write your breath.',

    // Home
    btn_import: 'Condensation',
    btn_ai: 'Breathe Words',
    no_decks: 'The glass is clear.',
    btn_seed: 'First Frost',
    deck_sub: 'Memory Trace',
    deck_ready: 'Touch',
    action_open: 'Clear →',

    // Import
    import_title: 'New Frost',
    import_drop: 'Drop Words Here',
    import_uploading: 'Freezing...',
    import_abort: 'Melt',

    // Lobby
    lobby_title: 'Frosted Window',
    lobby_id: '',
    lobby_status: '',
    stat_due: 'FOGGY',
    stat_learn: 'CLEARING',
    stat_master: 'CRYSTAL',
    mode_std: 'Clear the Glass',
    mode_weak: 'Wipe Again',
    mode_cram: 'Quick Breath',
    unit_cram: 'Words',
    btn_exit: 'Step Away',

    // Study
    lbl_mode: 'Current Breath',
    btn_reveal: 'Breathe',
    btn_fail: 'Fog Returns',
    btn_pass: 'Keep Clear',
    msg_locked: 'Glass Locked',

    // Summary
    sum_title: 'Session Melts',
    sum_good: 'Cleared',
    sum_bad: 'Fogged',

    // Graveyard
    grave_title: 'Crystal Archive',
    grave_empty: 'No crystals yet.',
    grave_back: 'Step Back',
    grave_resurrect: 'Breathe Again',
    grave_link: 'Crystals',

    // Edit & Audio
    btn_edit: 'Rewrite',
    btn_save: 'Freeze',
    btn_audio: 'Whisper',

    // Inspector
    btn_inspect: 'View Window',
    inspect_title: 'Frost Traces',
    col_word: 'Word',
    col_lvl: 'Clarity',
    col_due: 'Next Fog',
    btn_back: 'Back'
  }
};

export const t = derived(theme, $theme => DICTIONARY[$theme as keyof typeof DICTIONARY]);
