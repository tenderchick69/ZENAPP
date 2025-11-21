# AI Generation Specification for VOCAPP

## Database Schema

The `cards` table in Supabase has the following structure:

### Required Columns
| Column       | Type     | Required | Description                                    |
|-------------|----------|----------|------------------------------------------------|
| `headword`  | `string` | ✅ Yes   | The vocabulary word (e.g., "ephemeral")       |
| `definition`| `string` | ✅ Yes   | English definition of the word                |

### Optional Columns (Enrich the Learning Experience)
| Column       | Type     | Required | Description                                    |
|-------------|----------|----------|------------------------------------------------|
| `gloss_de`  | `string` | ⚠️ Optional | German translation (für Deutsche Lernende)   |
| `pos`       | `string` | ⚠️ Optional | Part of speech (noun, verb, adjective, etc.) |
| `ipa`       | `string` | ⚠️ Optional | IPA pronunciation (e.g., "/ɪˈfɛm.ər.əl/")   |
| `example`   | `string` | ⚠️ Optional | Example sentence using the word              |
| `mnemonic`  | `string` | ⚠️ Optional | Memory aid / mnemonic device                 |
| `etymology` | `string` | ⚠️ Optional | Word origin (e.g., "From Greek ephēmeros")   |
| `tags`      | `string` | ⚠️ Optional | Comma-separated tags (e.g., "GRE,academic")  |

### System Columns (Auto-Managed, DO NOT INCLUDE IN CSV)
| Column       | Type      | Description                                  |
|-------------|-----------|----------------------------------------------|
| `id`        | `integer` | Auto-generated primary key                   |
| `deck_id`   | `integer` | Foreign key to decks table                   |
| `state`     | `integer` | SRS state (0=new, 1-4=learning, 5=mastered)  |
| `interval`  | `integer` | Days until next review                       |
| `due`       | `timestamp`| ISO 8601 date when card is due for review   |
| `created_at`| `timestamp`| Auto-generated creation timestamp            |

---

## CSV Format Requirements

### Structure
- **Delimiter:** Comma (`,`)
- **Encoding:** UTF-8
- **Header Row:** Must include column names matching the schema
- **Quotes:** Use double quotes (`"`) for fields containing commas, newlines, or quotes
- **Escape:** Double quotes inside quoted fields must be escaped as `""`

### Minimum Valid CSV (Bare Bones)
```csv
headword,definition
ephemeral,Lasting for a very short time
sanguine,Optimistic or positive, especially in a bad situation
```

### Recommended CSV (With Rich Data)
```csv
headword,definition,gloss_de,pos,ipa,example,mnemonic,etymology
ephemeral,Lasting for a very short time,vergänglich,adjective,/ɪˈfɛm.ər.əl/,"The cherry blossoms are ephemeral, blooming for only a week.",Think of 'mayfly' - ephemeral insects that live just one day,"From Greek ephēmeros 'lasting only a day' (epi 'upon' + hēmera 'day')"
sanguine,Optimistic or positive, especially in a bad situation,optimistisch,adjective,/ˈsæŋ.ɡwɪn/,"Despite the setback, she remained sanguine about her chances.",Sanguine = blood = red cheeks = cheerful,"From Latin sanguis 'blood' (associated with cheerful temperament)"
```

---

## System Prompt for AI Generators

Use the following prompt when asking ChatGPT, Claude, or other LLMs to generate vocabulary flashcards:

```markdown
You are a vocabulary flashcard generator for an advanced English learning app.

Generate a CSV file containing [NUMBER] vocabulary words at [LEVEL] level.

**Requirements:**
1. CSV Format: headword,definition,gloss_de,pos,ipa,example,mnemonic,etymology
2. Target Level: [GRE/SAT/TOEFL/Academic/Advanced/etc.]
3. Word Selection: Focus on [THEME/TOPIC if specified]

**Column Guidelines:**
- `headword`: The target vocabulary word (in English)
- `definition`: Clear, concise English definition (one sentence preferred)
- `gloss_de`: German translation (if known, otherwise leave empty)
- `pos`: Part of speech (noun, verb, adjective, adverb, etc.)
- `ipa`: IPA pronunciation notation in slashes /.../ (if known)
- `example`: A natural example sentence demonstrating usage
- `mnemonic`: Creative memory aid or visualization
- `etymology`: Word origin with historical context (keep under 100 characters)

**Output:**
- Generate ONLY the CSV content, no markdown code blocks
- Use proper CSV escaping (double quotes for fields with commas)
- Ensure UTF-8 compatibility
- Verify IPA notation accuracy
- Make mnemonics creative and memorable
- Keep etymology concise but informative

Example output format:
headword,definition,gloss_de,pos,ipa,example,mnemonic,etymology
ephemeral,Lasting for a very short time,vergänglich,adjective,/ɪˈfɛm.ər.əl/,"The cherry blossoms are ephemeral.",Think mayfly - lives one day,"Greek ephēmeros 'lasting one day'"
```

---

## Usage Example

### For ChatGPT/Claude:
> "Generate 50 GRE-level vocabulary words focused on academic writing. Use the CSV format specified above with all optional fields filled."

### For Theme-Based Decks:
> "Generate 30 medical terminology flashcards for pre-med students. Include etymology where relevant, as medical terms often derive from Latin/Greek."

### For Language Transfer:
> "Generate 40 German-English cognate pairs (words that share roots in both languages). Include both German gloss and etymology showing the connection."

---

## Import Process

1. **Generate CSV** using the AI prompt above
2. **Save file** as UTF-8 encoded `.csv`
3. **Navigate to** `/import` in VOCAPP
4. **Upload CSV** and select target deck
5. **Verify** import in "View Garden" mode
6. **Begin studying** - cards start at state 0 (new)

---

## Data Quality Tips

✅ **DO:**
- Provide accurate IPA (check pronunciation dictionaries)
- Create vivid, memorable mnemonics
- Use natural, modern example sentences
- Keep definitions concise (1-2 sentences max)
- Include German translations for German learners

❌ **DON'T:**
- Include HTML, markdown, or special formatting
- Use offensive or inappropriate examples
- Generate duplicate headwords
- Leave required fields (headword, definition) empty
- Use non-UTF-8 characters without proper encoding

---

## Technical Notes

- **SRS Algorithm:** Cards start at state 0 (new). When studied, they progress through intervals: 2 days → 5 days → 10 days → 20 days → eternal (mastered).
- **Deck Assignment:** On import, all cards are assigned to the selected deck via `deck_id`.
- **Due Dates:** Initial due date is set to current timestamp (cards are immediately available for study).
- **Tags:** Currently stored as comma-separated string, not as relational data.

---

## Future Enhancements

📋 Planned features for AI-generated content:
- **Audio Field:** URL to pronunciation audio (e.g., Forvo API)
- **Image Field:** URL to visual mnemonic image
- **Difficulty Rating:** Auto-estimate word difficulty (1-10 scale)
- **Related Words:** Synonyms, antonyms, collocations
- **Usage Frequency:** Corpus-based frequency data

---

**Last Updated:** 2025-11-22
**Schema Version:** 1.0
**Compatible with:** VOCAPP (SvelteKit + Tailwind v4 + Supabase)
