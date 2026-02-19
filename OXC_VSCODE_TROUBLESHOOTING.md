# Oxc VS Code Troubleshooting

This project uses the `oxc.oxc-vscode` extension with local `oxlint` and `oxfmt`.

If you see errors like:

- `oxc client: couldn't create connection to server`
- `Launching server using command node failed. Error: spawn node ENOENT`

the extension can find `oxlint` / `oxfmt`, but your VS Code GUI environment cannot find `node`.

## Keep workspace config generic

Do not commit machine-specific paths in `.vscode/settings.json` (for example, an NVM path in `oxc.path.node`).

## Local fix (user settings)

1. Get your Node path:

```bash
command -v node
```

2. Add this in Cursor/VS Code **User** settings (not workspace settings):

```json
{
  "oxc.path.node": "/absolute/path/to/node-directory"
}
```

## Optional stable symlink

If your Node path changes often (nvm, mise, fnm), create a stable symlink once:

```bash
mkdir -p "$HOME/.local/bin"
ln -sf "$(command -v node)" "$HOME/.local/bin/node"
```

Then set:

```json
{
  "oxc.path.node": "/Users/<your-user>/.local/bin"
}
```

## After changing settings

Run `Developer: Reload Window` so the Oxc extension restarts with the updated runtime path.
