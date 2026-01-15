import type { Diagnostic } from "@codemirror/lint";
import { linter } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
// @ts-ignore - typo-js has no types
import Typo from "typo-js";

// Singleton dictionary instance
let dictionary: Typo | null = null;
let dictionaryLoading = false;
let dictionaryReady = false;
let dictionaryFailed = false;

// Initialize the dictionary (lazy load)
async function initDictionary(): Promise<Typo | null> {
  if (dictionaryReady && dictionary) return dictionary;
  if (dictionaryFailed) return null;
  
  if (dictionaryLoading) {
    // Wait for loading to complete
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (dictionaryReady && dictionary) {
          clearInterval(check);
          resolve(dictionary);
        } else if (dictionaryFailed) {
          clearInterval(check);
          resolve(null);
        }
      }, 100);
    });
  }

  dictionaryLoading = true;

  try {
    // Load dictionary files from node_modules via server
    const [affResponse, dicResponse] = await Promise.all([
      fetch("/dictionaries/en_US.aff"),
      fetch("/dictionaries/en_US.dic"),
    ]);

    if (!affResponse.ok || !dicResponse.ok) {
      throw new Error("Failed to load dictionary files");
    }

    const affData = await affResponse.text();
    const dicData = await dicResponse.text();

    dictionary = new Typo("en_US", affData, dicData);
    dictionaryReady = true;
    dictionaryLoading = false;
    return dictionary;
  } catch (error) {
    console.error("Failed to initialize dictionary:", error);
    dictionaryLoading = false;
    dictionaryFailed = true;
    return null;
  }
}

// Word boundary regex - matches words (including contractions)
const WORD_REGEX = /[a-zA-Z]+(?:'[a-zA-Z]+)?/g;

// Words to ignore (markdown syntax, code, etc.)
const IGNORE_PATTERNS = [
  /^https?$/i, // URL protocols
  /^www$/i, // www prefix
  /^[A-Z]{2,}$/, // Acronyms like USA, API
  /^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/, // CamelCase
];

function shouldIgnoreWord(word: string): boolean {
  // Ignore very short words
  if (word.length < 2) return true;

  // Ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(word)) return true;
  }

  return false;
}

// Check if position is inside markdown syntax we should skip
function isInsideMarkdownSyntax(text: string, pos: number): boolean {
  const textBefore = text.slice(0, pos);

  // Check for inline code
  const backticksBefore = (textBefore.match(/`/g) || []).length;
  if (backticksBefore % 2 === 1) return true;

  // Check for fenced code block
  const codeBlockMatches = textBefore.match(/```/g) || [];
  if (codeBlockMatches.length % 2 === 1) return true;

  // Check for URLs
  const urlMatch = textBefore.match(/https?:\/\/[^\s)]*$/);
  if (urlMatch) return true;

  // Check for link syntax [text](url) - skip URL part
  const linkMatch = textBefore.match(/\]\([^)]*$/);
  if (linkMatch) return true;

  return false;
}

// Spell check a document and return diagnostics
async function spellCheckDocument(doc: string): Promise<Diagnostic[]> {
  const dict = await initDictionary();
  if (!dict) return []; // Dictionary not loaded yet or failed
  
  const diagnostics: Diagnostic[] = [];
  const lines = doc.split("\n");
  let offset = 0;

  for (const line of lines) {
    let match;
    WORD_REGEX.lastIndex = 0;

    while ((match = WORD_REGEX.exec(line)) !== null) {
      const word = match[0];
      const wordStart = offset + match.index;
      const wordEnd = wordStart + word.length;

      // Skip if inside markdown syntax
      if (isInsideMarkdownSyntax(doc, wordStart)) continue;

      // Skip words we should ignore
      if (shouldIgnoreWord(word)) continue;

      // Check spelling
      if (!dict.check(word)) {
        const suggestions = dict.suggest(word).slice(0, 5);

        diagnostics.push({
          from: wordStart,
          to: wordEnd,
          severity: "warning",
          message: suggestions.length > 0 ? `Suggestions: ${suggestions.join(", ")}` : "Unknown word",
          source: "spellcheck",
        });
      }
    }

    offset += line.length + 1; // +1 for newline
  }

  return diagnostics;
}

// Pre-created spell check linter extension - single instance
export const spellCheckExtension: Extension = linter(
  async (view: EditorView) => {
    const doc = view.state.doc.toString();
    try {
      return await spellCheckDocument(doc);
    } catch (error) {
      console.error("Spell check error:", error);
      return [];
    }
  },
  {
    delay: 500, // 500ms debounce after typing stops
  }
);

// Get suggestions for a word
export async function getSuggestions(word: string): Promise<string[]> {
  const dict = await initDictionary();
  if (!dict) return [];
  return dict.suggest(word).slice(0, 10);
}

// Check if a word is spelled correctly
export async function isCorrect(word: string): Promise<boolean> {
  const dict = await initDictionary();
  if (!dict) return true; // Assume correct if dict not loaded
  return dict.check(word);
}
