import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Everforest Dark Medium colors
const colors = {
  bg_dim: "#232A2E",
  bg0: "#2D353B",
  bg1: "#343F44",
  bg2: "#3D484D",
  bg3: "#475258",
  bg4: "#4F585E",
  fg: "#D3C6AA",
  red: "#E67E80",
  orange: "#E69875",
  yellow: "#DBBC7F",
  green: "#A7C080",
  aqua: "#83C092",
  blue: "#7FBBB3",
  purple: "#D699B6",
  grey0: "#7A8478",
  grey1: "#859289",
  grey2: "#9DA9A0",
};

// Editor theme
const everforestTheme = EditorView.theme(
  {
    "&": {
      color: colors.fg,
      backgroundColor: "transparent",
    },
    ".cm-content": {
      caretColor: colors.aqua,
      fontFamily: "inherit",
      padding: "16px 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: colors.aqua,
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: colors.bg3,
      },
    ".cm-panels": {
      backgroundColor: colors.bg1,
      color: colors.fg,
    },
    ".cm-panels.cm-panels-top": {
      borderBottom: `1px solid ${colors.bg3}`,
    },
    ".cm-panels.cm-panels-bottom": {
      borderTop: `1px solid ${colors.bg3}`,
    },
    ".cm-searchMatch": {
      backgroundColor: colors.bg3,
      outline: `1px solid ${colors.yellow}`,
    },
    ".cm-searchMatch.cm-searchMatch-selected": {
      backgroundColor: colors.bg2,
    },
    ".cm-activeLine": {
      backgroundColor: "transparent",
    },
    ".cm-selectionMatch": {
      backgroundColor: colors.bg3,
    },
    "&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": {
      backgroundColor: colors.bg3,
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: colors.grey0,
      border: "none",
      borderRight: `1px solid ${colors.bg2}`,
    },
    ".cm-activeLineGutter": {
      backgroundColor: "transparent",
      color: colors.grey2,
    },
    ".cm-foldPlaceholder": {
      backgroundColor: colors.bg2,
      color: colors.grey1,
      border: "none",
    },
    ".cm-tooltip": {
      border: `1px solid ${colors.bg3}`,
      backgroundColor: colors.bg1,
    },
    ".cm-tooltip .cm-tooltip-arrow:before": {
      borderTopColor: "transparent",
      borderBottomColor: "transparent",
    },
    ".cm-tooltip .cm-tooltip-arrow:after": {
      borderTopColor: colors.bg1,
      borderBottomColor: colors.bg1,
    },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": {
        backgroundColor: colors.bg2,
        color: colors.fg,
      },
    },
    ".cm-line": {
      padding: "0 16px",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "inherit",
      lineHeight: "1.7",
    },
  },
  { dark: true }
);

// Syntax highlighting
const everforestHighlightStyle = HighlightStyle.define([
  // Comments
  { tag: t.comment, color: colors.grey1, fontStyle: "italic" },
  { tag: t.lineComment, color: colors.grey1, fontStyle: "italic" },
  { tag: t.blockComment, color: colors.grey1, fontStyle: "italic" },
  
  // Strings
  { tag: t.string, color: colors.green },
  { tag: t.special(t.string), color: colors.aqua },
  
  // Numbers
  { tag: t.number, color: colors.purple },
  { tag: t.integer, color: colors.purple },
  { tag: t.float, color: colors.purple },
  
  // Keywords
  { tag: t.keyword, color: colors.red },
  { tag: t.operator, color: colors.orange },
  { tag: t.definitionKeyword, color: colors.red },
  { tag: t.controlKeyword, color: colors.red },
  
  // Types
  { tag: t.typeName, color: colors.yellow },
  { tag: t.className, color: colors.yellow },
  { tag: t.namespace, color: colors.yellow },
  
  // Functions
  { tag: t.function(t.variableName), color: colors.green },
  { tag: t.function(t.propertyName), color: colors.green },
  { tag: t.definition(t.variableName), color: colors.fg },
  
  // Variables
  { tag: t.variableName, color: colors.fg },
  { tag: t.propertyName, color: colors.blue },
  { tag: t.special(t.variableName), color: colors.purple },
  
  // Constants
  { tag: t.constant(t.variableName), color: colors.purple },
  { tag: t.bool, color: colors.purple },
  { tag: t.null, color: colors.purple },
  
  // Punctuation
  { tag: t.punctuation, color: colors.grey2 },
  { tag: t.bracket, color: colors.grey2 },
  { tag: t.separator, color: colors.grey2 },
  
  // Markdown specific
  { tag: t.heading, color: colors.green, fontWeight: "bold" },
  { tag: t.heading1, color: colors.green, fontWeight: "bold" },
  { tag: t.heading2, color: colors.aqua, fontWeight: "bold" },
  { tag: t.heading3, color: colors.blue, fontWeight: "bold" },
  { tag: t.heading4, color: colors.yellow, fontWeight: "bold" },
  { tag: t.heading5, color: colors.orange, fontWeight: "bold" },
  { tag: t.heading6, color: colors.purple, fontWeight: "bold" },
  { tag: t.emphasis, color: colors.purple, fontStyle: "italic" },
  { tag: t.strong, color: colors.orange, fontWeight: "bold" },
  { tag: t.link, color: colors.aqua, textDecoration: "underline" },
  { tag: t.url, color: colors.aqua },
  { tag: t.monospace, color: colors.yellow },
  { tag: t.quote, color: colors.grey2, fontStyle: "italic" },
  { tag: t.list, color: colors.green },
  { tag: t.contentSeparator, color: colors.bg4 },
  
  // Meta
  { tag: t.meta, color: colors.grey1 },
  { tag: t.processingInstruction, color: colors.grey1 },
  
  // Invalid
  { tag: t.invalid, color: colors.red, textDecoration: "underline" },
]);

export const everforest: Extension = [
  everforestTheme,
  syntaxHighlighting(everforestHighlightStyle),
];
