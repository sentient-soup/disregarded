# Disregarded

A terminal-style essay writing and publishing app with a minimalist, keyboard-driven interface.

## Features

- **Terminal UI** - Command-based navigation inspired by classic terminal interfaces
- **Markdown Editor** - Full CodeMirror 6 editor with syntax highlighting
- **Spell Check** - Client-side spell checking with Hunspell dictionaries (typo-js)
- **Dictionary Lookup** - Select a word and press `Ctrl+D` to look up definitions
- **GitHub-style Alerts** - Support for `[!NOTE]`, `[!TIP]`, `[!WARNING]`, etc.
- **JWT Authentication** - Secure user registration and login
- **Draft/Publish Workflow** - Keep essays private or publish them publicly

## Tech Stack

- **Runtime**: [Bun](https://bun.sh)
- **Frontend**: React 19, TailwindCSS 4
- **Editor**: CodeMirror 6 with custom Everforest dark theme
- **Database**: SQLite (bun:sqlite)
- **Auth**: JWT with Argon2id password hashing
- **Markdown**: marked + marked-alert
- **Spell Check**: typo-js (Hunspell)

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+

### Install & Run

```bash
# Install dependencies
bun install

# Start development server (requires JWT_SECRET)
JWT_SECRET=dev-secret

bun dev

# Open http://localhost:3000
```

### Commands

| Command | Description |
|---------|-------------|
| `bun dev` | Start dev server with HMR |
| `bun start` | Start production server |
| `bun install` | Install dependencies |

## Terminal Commands

Once the app is running, use these commands in the terminal interface:

| Command | Description |
|---------|-------------|
| `help` | Show available commands |
| `register <user> <pass>` | Create a new account |
| `login <user> <pass>` | Log in to your account |
| `logout` | Log out |
| `new` | Create a new essay |
| `list` | List your essays |
| `edit <id>` | Edit an essay |
| `view <id>` | View an essay (read-only) |
| `publish <id>` | Publish an essay |
| `unpublish <id>` | Unpublish an essay |
| `delete <id>` | Delete an essay |
| `browse` | Browse public essays |
| `clear` | Clear terminal output |

## Editor Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save |
| `Ctrl+T` | Set title |
| `Ctrl+P` | Toggle preview |
| `Ctrl+D` | Dictionary lookup (select word first) |
| `Ctrl+Q` | Close editor |
| `Ctrl+Enter` | Publish |
| `Esc` | Close editor |

## Docker Deployment

### Build & Run

```bash
# Build the image
docker build -t disregarded .

# Run with required JWT_SECRET and persistent database
docker run -d \
  --name disregarded \
  -p 3000:3000 \
  -v /path/to/data:/data \
  -e JWT_SECRET=your-secure-secret-here \
  disregarded
```

### Deployment 

To deploy the image to ghcr (github container repo).
```sh
# Login - where CR_PAT is a token with package permissions
echo $CR_PAT | sudo docker login ghcr.io -u sentient-soup --password-stdin

# Build with the repo tag
sudo docker build -t ghcr.io/sentient-soup/disregarded:latest .

# Push to the repo
sudo docker push ghcr.io/sentient-soup/disregarded:latest
```

### Docker Compose

```bash
# Create .env file with your secret
echo "JWT_SECRET=$(openssl rand -base64 32)" > .env

# Start the container
docker-compose up -d

# View logs
docker-compose logs -f
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `JWT_SECRET` | **Yes** | - | Secret key for JWT signing. Server won't start without it. |
| `JWT_EXPIRY` | No | `86400` | Token lifetime in seconds (default: 24 hours) |
| `REGISTRATION_ENABLED` | No | `true` | Set to `false` to disable new user registration |
| `MAX_ESSAY_LENGTH` | No | `500000` | Maximum characters per essay (~500KB) |
| `DATABASE_PATH` | No | `/data/disregarded.db` | Path to SQLite database file |
| `PORT` | No | `3000` | Server port |

### Nginx Reverse Proxy

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name essays.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Project Structure

```
src/
├── index.ts              # Server entry point
├── index.html            # HTML entry point
├── index.css             # Everforest theme + styles
├── App.tsx               # Main React component
├── frontend.tsx          # React DOM entry
├── api/
│   ├── auth.ts           # Register/login endpoints
│   ├── essays.ts         # Essay CRUD endpoints
│   └── middleware.ts     # JWT auth middleware
├── components/
│   ├── AsciiLogo.tsx     # Terminal logo
│   ├── DictionaryPopup.tsx
│   ├── EssayEditor.tsx   # CodeMirror editor
│   ├── Terminal.tsx
│   ├── TerminalInput.tsx
│   └── TerminalOutput.tsx
├── db/
│   └── index.ts          # SQLite database + queries
├── hooks/
│   ├── useAuth.ts        # Auth state management
│   └── useTerminal.tsx   # Command handling
└── lib/
    ├── codemirror-theme.ts  # Everforest editor theme
    ├── jwt.ts               # JWT utilities
    └── spellcheck.ts        # Spell check linter
```

## License

MIT
