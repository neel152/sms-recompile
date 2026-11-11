# sms-recompile

A Claude Code mod that adds a **Recompile** pane for the [Super Mario Sunshine decompilation](https://github.com/doldecomp/sms).

- **Rebuild** runs `python -m ninja` in your decomp folder and shows the build output as it goes.
- **Progress** shows how much of the game matches the original: matched code, functions and fully matched files, for the whole game and for each part (Sunshine's own code, the JSystem engine and the Nintendo SDK). It reads `build/<version>/report.json`.
- `/recompile` reopens the pane.

The mod contains no game code or assets. You need your own copy of the game, set up the way the decomp's README describes.

## Before you install

1. Clone the decomp: `git clone https://github.com/doldecomp/sms`
2. Put your disc image in `orig/<version>/` and run `python configure.py --version <version>`.
3. Install ninja if you don't have it: `pip install ninja`

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install sms-recompile --marketplace neel152/sms-recompile
```

Answer `y` to add the marketplace, then pick a scope. The settings screen asks for:

- **Decomp folder:** the full path to your `sms` clone
- **Game version:** the version you configured (`GMSE01` is the US release)

From a shell:

```
claude plugin install sms-recompile --marketplace neel152/sms-recompile
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `neel152/sms-recompile`, then **Add plugin**.

## Licence

MIT
