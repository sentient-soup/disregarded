export function AsciiLogo() {
  // Blocky pixel-style logo similar to OpenCode
  // Using Unicode block characters for a cleaner look
  return (
    <div className="logo-container">
      <pre className="logo-text" aria-label="Disregarded">
{`█▀▄ █ █▀ █▀█ █▀▀ █▀▀ ▄▀█ █▀█ █▀▄ █▀▀ █▀▄
█▄▀ █ ▄█ █▀▄ ██▄ █▄█ █▀█ █▀▄ █▄▀ ██▄ █▄▀`}
      </pre>
    </div>
  );
}
