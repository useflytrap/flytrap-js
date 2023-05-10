<p align="center">
	<img src="https://github.com/useflytrap/flytrap-js/raw/main/docs/flytrap-banner.png" />
</p>

# 🐛 Flytrap JavaScript SDK

[![npm version][npm-version-src]][npm-href]
[![npm downloads][npm-downloads-src]][npm-href]
[![Github Actions][github-actions-src]][github-actions-href]

> Catch bugs in production and replay them in your local development environment. Fix bugs in production in a matter of minutes, instead of hours.

- [🐛 &nbsp;Changelog](https://www.useflytrap.com/changelog)
- [📖 &nbsp;Documentation](https://docs.useflytrap.com)

## Features

- Catch bugs both front- and backend bugs
- Replay bugs as if you were the user who had the bug
- Identify user who had bug

[📖 &nbsp;Read more](https://docs.useflytrap.com/features)

## 💻 Development

- Clone this repository
- Enable [Corepack](https://github.com/nodejs/corepack) using `corepack enable` (use `npm i -g corepack` for Node.js < 16.10)
- Install dependencies using `pnpm install`
- Run the tests using `pnpm dev`

## License

Made with ❤️ in Helsinki

Published under [MIT License](./LICENSE).

## Known Limitations

- If there are multiple functions in the same file with the same name and args, replaying will have
  odd behavior.
- If there are multiple function calls with the same args in the same scope, removing or adding function calls with same args will result to wrong replay behavior.
- Adding / removing anonymous functions, (eg; `() => {}`,), in a scope where there already is anonymous functions will cause the replay to go wrong
- React/framework errors during development (eg. hydration errors, ) manifest as weird errors such as "TypeError: Cannot read properties of null (reading 'useContext')", where the stacktrace points towards Flytrap. Because of this, you're recommended to
  not use flytrap during active development if you're not replaying.

<!-- Links -->

[npm-href]: https://npmjs.com/package/useflytrap
[github-actions-href]: https://github.com/useflytrap/flytrap-js/actions/workflows/ci.yml

<!-- Badges -->

[npm-version-src]: https://badgen.net/npm/v/useflytrap?color=black
[npm-downloads-src]: https://badgen.net/npm/dw/useflytrap?color=black
[prettier-src]: https://badgen.net/badge/style/prettier/black?icon=github
[github-actions-src]: https://github.com/useflytrap/flytrap-js/actions/workflows/ci.yml/badge.svg
