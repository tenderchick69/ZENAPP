<script lang="ts">
  import { savePreferences } from '$lib/auth';
  import { SUPPORTED_LANGUAGES } from '$lib/languages';
  import { theme } from '$lib/theme';

  export let onComplete: () => void;

  let nativeLanguage = 'English';
  let targetLanguage = 'Korean';
  let experienceLevel = 'beginner';

  async function handleSubmit() {
    await savePreferences({
      native_language: nativeLanguage,
      target_language: targetLanguage,
      experience_level: experienceLevel,
      theme: $theme
    });
    onComplete();
  }

  async function handleSkip() {
    // Save minimal preferences to prevent modal from reappearing
    await savePreferences({
      native_language: 'English',
      target_language: 'Korean',
      experience_level: 'beginner',
      theme: $theme
    });
    onComplete();
  }
</script>

<div class="onboarding-overlay" data-theme={$theme}>
  <div class="onboarding-modal">
    <h1 class="title">Welcome to ZenApp! 🌱</h1>
    <p class="subtitle">Let's personalize your learning experience.</p>

    <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      <div class="form-group">
        <label for="native-lang">What's your native language?</label>
        <select id="native-lang" bind:value={nativeLanguage}>
          <option value="English">🇬🇧 English</option>
          <option value="German">🇩🇪 German</option>
        </select>
      </div>

      <div class="form-group">
        <label for="target-lang">What language do you want to learn?</label>
        <select id="target-lang" bind:value={targetLanguage}>
          {#each SUPPORTED_LANGUAGES as lang}
            <option value={lang}>{lang}</option>
          {/each}
        </select>
      </div>

      <div class="form-group">
        <label>Your experience level?</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" bind:group={experienceLevel} value="beginner" />
            <span>Complete Beginner</span>
          </label>
          <label class="radio-label">
            <input type="radio" bind:group={experienceLevel} value="some" />
            <span>Some Knowledge</span>
          </label>
          <label class="radio-label">
            <input type="radio" bind:group={experienceLevel} value="intermediate" />
            <span>Intermediate</span>
          </label>
          <label class="radio-label">
            <input type="radio" bind:group={experienceLevel} value="advanced" />
            <span>Advanced</span>
          </label>
        </div>
      </div>

      <button type="submit" class="submit-btn">🚀 Start Learning</button>
    </form>

    <button class="skip-btn" onclick={handleSkip}>Skip for now</button>
  </div>
</div>

<style>
  .onboarding-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
  }

  .onboarding-modal {
    background: var(--color-panel);
    border: 2px solid var(--color-accent);
    border-radius: 16px;
    padding: 3rem 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  }

  .title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-main);
    margin: 0 0 0.5rem 0;
    text-align: center;
    font-family: var(--font-heading);
  }

  .subtitle {
    color: var(--color-accent);
    text-align: center;
    margin: 0 0 2rem 0;
    font-size: 1rem;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    color: var(--color-accent);
    font-size: 0.9rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid var(--color-accent);
    background: var(--color-bg);
    color: var(--color-main);
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .form-group select:focus {
    outline: none;
    border-color: var(--color-success);
    box-shadow: 0 0 0 2px var(--color-success);
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-dim);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--color-main);
    font-weight: normal;
    text-transform: none;
    letter-spacing: normal;
  }

  .radio-label:hover {
    border-color: var(--color-accent);
    background: var(--color-bg);
  }

  .radio-label input[type="radio"] {
    cursor: pointer;
  }

  .radio-label input[type="radio"]:checked ~ span {
    color: var(--color-accent);
    font-weight: 600;
  }

  .submit-btn {
    width: 100%;
    padding: 1rem 2rem;
    background: var(--color-accent);
    color: var(--color-bg);
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 1rem;
  }

  .submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--color-accent);
  }

  .skip-btn {
    width: 100%;
    padding: 0.75rem;
    background: transparent;
    color: var(--color-dim);
    border: 1px solid var(--color-dim);
    border-radius: 8px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .skip-btn:hover {
    color: var(--color-main);
    border-color: var(--color-main);
  }

  @media (max-width: 640px) {
    .onboarding-modal {
      padding: 2rem 1.5rem;
    }

    .title {
      font-size: 2rem;
    }
  }
</style>
