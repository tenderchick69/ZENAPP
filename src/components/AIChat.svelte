<script lang="ts">
  import { theme } from '$lib/theme';
  import type { GenerationParams } from '$lib/prompts';

  export let onGenerate: (params: GenerationParams) => void;

  type Message = {
    role: 'user' | 'assistant';
    content: string;
  };

  let messages: Message[] = [
    {
      role: 'assistant',
      content: "Hey! What would you like to learn today? Tell me the language and what kind of vocabulary you're looking for. Be specific - the more detail, the better your deck!"
    }
  ];
  let input = '';
  let nativeLanguage: 'English' | 'German' = 'English';
  let questionCount = 0;
  let isReady = false;

  // Conversation context extracted from messages
  let conversationContext = {
    targetLanguage: '',
    category: '',
    level: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    cardCount: 10,
  };

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = input.trim();
    messages = [...messages, { role: 'user', content: userMessage }];
    input = '';

    // Simple heuristic: After 2-3 exchanges, AI has enough context
    questionCount++;

    if (questionCount >= 2) {
      // AI confirms readiness
      messages = [...messages, {
        role: 'assistant',
        content: "Perfect! I have enough to create a great deck for you. Click 'Create Deck' when you're ready, or tell me more if you want to refine it further."
      }];
      isReady = true;
    } else {
      // AI asks clarifying question
      const question = getClarifyingQuestion(questionCount, userMessage);
      messages = [...messages, { role: 'assistant', content: question }];
    }
  }

  function getClarifyingQuestion(count: number, userMessage: string): string {
    // Simple pattern matching to extract info
    const lower = userMessage.toLowerCase();

    // Extract target language if mentioned
    if (!conversationContext.targetLanguage) {
      if (lower.includes('korean')) conversationContext.targetLanguage = 'Korean';
      else if (lower.includes('japanese')) conversationContext.targetLanguage = 'Japanese';
      else if (lower.includes('spanish')) conversationContext.targetLanguage = 'Spanish';
      else if (lower.includes('french')) conversationContext.targetLanguage = 'French';
      else if (lower.includes('german')) conversationContext.targetLanguage = 'German';
      else if (lower.includes('mandarin') || lower.includes('chinese')) conversationContext.targetLanguage = 'Mandarin';
    }

    // Extract level hints
    if (lower.includes('beginner') || lower.includes('basic')) conversationContext.level = 'beginner';
    else if (lower.includes('intermediate')) conversationContext.level = 'intermediate';
    else if (lower.includes('advanced') || lower.includes('fluent')) conversationContext.level = 'advanced';

    // Extract card count hints (max 20 cards per deck)
    const numberMatch = userMessage.match(/\d+/);
    if (numberMatch) {
      conversationContext.cardCount = Math.min(20, Math.max(5, parseInt(numberMatch[0])));
    }

    // Generate contextual questions
    const questions = [
      "Interesting! What's your level - beginner, intermediate, or advanced?",
      "How many cards would you like? I'd suggest 10-15 for a good study session (max 20).",
      "Any specific context? Like for travel, making friends, or impressing someone special? 😏"
    ];

    return questions[count - 1] || questions[2];
  }

  function handleCreate() {
    // Compile full conversation
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n\n');

    onGenerate({
      nativeLanguage,
      targetLanguage: conversationContext.targetLanguage || 'Korean',
      category: conversationContext.category || 'random',
      level: conversationContext.level,
      cardCount: conversationContext.cardCount,
      customRequest: conversationText,
    });
  }
</script>

<div class="ai-chat" data-theme={$theme}>
  <div class="native-language-select">
    <label for="native-select">Your language:</label>
    <select id="native-select" bind:value={nativeLanguage}>
      <option value="English">🇬🇧 English</option>
      <option value="German">🇩🇪 German</option>
    </select>
  </div>

  <div class="messages">
    {#each messages as message}
      <div class="message {message.role}">
        <div class="bubble">
          {message.content}
        </div>
      </div>
    {/each}
  </div>

  <div class="input-area">
    <input
      type="text"
      bind:value={input}
      placeholder="Describe what you want to learn..."
      onkeydown={(e) => e.key === 'Enter' && sendMessage()}
    />
    <button onclick={sendMessage} class="send-btn" disabled={!input.trim()}>
      Send
    </button>
  </div>

  {#if isReady}
    <button onclick={handleCreate} class="create-deck-btn">
      🪄 Create Deck
    </button>
  {/if}
</div>

<style>
  .ai-chat {
    max-width: 600px;
    margin: 0 auto;
  }

  .native-language-select {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: var(--color-panel);
    border-radius: 8px;
  }

  .native-language-select label {
    color: var(--color-accent);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .native-language-select select {
    padding: 0.5rem;
    border: 1px solid var(--color-accent);
    background: var(--color-bg);
    color: var(--color-main);
    border-radius: 4px;
    cursor: pointer;
  }

  .messages {
    max-height: 400px;
    overflow-y: auto;
    padding: 1rem;
    border: 1px solid var(--color-panel);
    border-radius: 8px;
    margin-bottom: 1rem;
    background: var(--color-bg);
  }

  /* Scrollbar styling */
  .messages::-webkit-scrollbar {
    width: 8px;
  }

  .messages::-webkit-scrollbar-track {
    background: var(--color-panel);
  }

  .messages::-webkit-scrollbar-thumb {
    background: var(--color-accent);
    border-radius: 4px;
  }

  .message {
    margin-bottom: 1rem;
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .message.user {
    text-align: right;
  }

  .message .bubble {
    display: inline-block;
    max-width: 80%;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    line-height: 1.5;
  }

  .message.user .bubble {
    background: var(--color-accent);
    color: var(--color-bg);
    border-bottom-right-radius: 4px;
  }

  .message.assistant .bubble {
    background: var(--color-panel);
    color: var(--color-main);
    border-bottom-left-radius: 4px;
    border: 1px solid var(--color-dim);
  }

  .input-area {
    display: flex;
    gap: 0.5rem;
  }

  .input-area input {
    flex: 1;
    padding: 0.75rem;
    border: 1px solid var(--color-accent);
    background: var(--color-panel);
    color: var(--color-main);
    border-radius: 8px;
    font-size: 1rem;
  }

  .input-area input:focus {
    outline: none;
    border-color: var(--color-success);
    box-shadow: 0 0 0 2px var(--color-success);
  }

  .send-btn {
    padding: 0.75rem 1.5rem;
    background: var(--color-accent);
    color: var(--color-bg);
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .send-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .create-deck-btn {
    width: 100%;
    padding: 1rem;
    margin-top: 1rem;
    background: var(--color-success);
    color: var(--color-bg);
    border: none;
    border-radius: 8px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }

  .create-deck-btn:hover {
    transform: scale(1.05) !important;
    box-shadow: 0 4px 20px var(--color-success);
  }

  /* Theme-specific styles */
  [data-theme="syndicate"] .create-deck-btn {
    box-shadow: 0 0 20px rgba(0, 255, 242, 0.3);
  }

  [data-theme="ember"] .create-deck-btn {
    background: linear-gradient(135deg, #ff6b35, #ff9f1c);
  }

  [data-theme="frost"] .messages {
    background: rgba(232, 244, 248, 0.03);
    backdrop-filter: blur(10px);
  }

  [data-theme="zen"] .message.assistant .bubble {
    border-color: rgba(168, 197, 197, 0.3);
  }

  @media (max-width: 640px) {
    .message .bubble {
      max-width: 90%;
      font-size: 0.9rem;
    }

    .input-area {
      flex-direction: column;
    }

    .send-btn {
      width: 100%;
    }
  }
</style>
