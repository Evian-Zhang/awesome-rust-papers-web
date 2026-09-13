# awesome-rust-papers-web

Single-page frontend for the
[awesome-rust-papers](https://github.com/Evian-Zhang/awesome-rust-papers) collection.
Built with SvelteKit + Svelte 5 + TypeScript + Tailwind CSS + ECharts, fully static.

## Prerequisites

- Node.js >= 23.6 and npm
- Python >= 3.8 and a clone of the
  [data repo](https://github.com/Evian-Zhang/awesome-rust-papers) (any location works).
  The generated data snapshot (`src/lib/generated/papers.json`) is not committed, so
  generate it before running `dev`, `check`, `test:logic` or `build`:

  ```bash
  git clone https://github.com/Evian-Zhang/awesome-rust-papers
  python3 awesome-rust-papers/scripts/build-web-data.py --out src/lib/generated
  ```

  Re-run the command after data changes.

## Development

```bash
npm install
npm run dev          # dev server at /awesome-rust-papers
npm run check        # svelte-check
npm run lint         # eslint
npm run format       # prettier (write)
npm run test:logic   # advanced-search logic tests (node, no test framework)
```

## Build & deploy

```bash
npm run build        # static output in build/ (from the generated snapshot)
npm run preview      # serve the build output locally
```

Deployed to GitHub Pages by the CI of
[awesome-rust-papers](https://github.com/Evian-Zhang/awesome-rust-papers).
