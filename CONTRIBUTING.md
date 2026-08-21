# Contributing to SNAP (Substack Notes Authoring Platform)

Thank you for your interest in contributing to **SNAP**! We welcome contributions from developers, technical writers, and content creators.

---

## 🛠️ Development Setup

1. **Prerequisites**: Node.js v18+ and npm installed.
2. **Clone & Install**:
   ```bash
   git clone https://github.com/funmu/snap.git
   cd snap
   npm install
   ```
3. **Link CLI Locally**:
   ```bash
   npm link --force
   ```
4. **Test with Sample Data**:
   ```bash
   snap ingest samples/sample_notes.json
   snap topics
   ```

---

## 🧪 Testing & Code Quality

Before opening a Pull Request, please ensure your changes pass type checks and formatting:

```bash
# Type-check TypeScript files
npm run build
```

---

## 📝 Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names like `feature/topic-enhancement` or `fix/parser-edge-case`.
2. **Commit Messages**: Write clear, concise commit messages.
3. **Decoupled Architecture**: Ensure no user data, private keys, or personal state files are committed to the codebase. All user state must go into `~/.snap/` or custom `--data-dir`.

---

## 🐞 Reporting Bugs & Feature Requests

- Please use [GitHub Issues](https://github.com/funmu/snap/issues) to report bugs or submit feature requests.
- Provide step-by-step reproduction steps for bug reports.
