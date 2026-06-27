# SOULDAWN — public/ static assets

Files in this folder are served from the site root. For example,
`web/public/lookbook/dawn-break.jpg` is available at `/lookbook/dawn-break.jpg`.

## Folders

- `lookbook/` — lookbook photos (editorial / AI-generated shots).
  Reference them in `web/lib/lookbook.ts` (e.g. `image: "/lookbook/<file>.jpg"`).
- `products/` — product images for the catalog
  (e.g. `/products/king-of-the-ring.jpg`).
- `audio/` — ambient loop for the homepage sound toggle.
  The `SoundToggle` component expects `/audio/ambient.mp3`.

## Notes

- Use web-optimized files (JPG/WebP for photos, MP3/OGG for audio).
- Keep filenames lowercase with hyphens, no spaces.
- The `.gitkeep` files only exist to keep empty folders in Git; you can delete
  them once real assets are added.
