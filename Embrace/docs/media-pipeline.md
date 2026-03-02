# Media Pipeline (500+ Images)

This project now includes a catalog-backed media workflow designed for large image libraries.

## What is implemented

- `GET /api/media`: paginated, filterable media listing for frontend galleries.
- `POST /api/media`: admin-protected bulk upsert endpoint for image metadata.
- File-backed catalog schema: `data/media-library.json`.
- Vite local fallback catalog: `public/media-library.json` (used when `/api/media` is unavailable).
- Frontend media client in `src/lib/media.ts`.
- Portfolio page loads catalog data with static fallback.
- Admin page (`/admin`) includes bulk ingest form.
- Manifest generator script for folder imports: `scripts/generate-media-manifest.mjs`.

## Catalog schema

Each image supports:

- `id`
- `title`
- `alt`
- `description`
- `category`
- `tags` (array)
- `sortOrder`
- `status` (`active`/`inactive`)
- `variants.thumb`
- `variants.medium`
- `variants.large`
- `width`, `height` (optional)

## Environment variables

- `MEDIA_ADMIN_TOKEN`: required for `POST /api/media`.
- `MEDIA_LIBRARY_PATH` (optional): custom path for media JSON file.

## Bulk ingest flow

1. Upload files to your storage/CDN.
2. Generate a metadata payload.
3. Send payload to `POST /api/media` with `x-admin-token`.
4. Frontend gallery reads data from `GET /api/media`.

## Generate payload from a local folder

```bash
node scripts/generate-media-manifest.mjs \
  --dir public/gallery/custom \
  --base /gallery/custom \
  --category Custom \
  --output tmp/custom-manifest.json
```

Then paste `tmp/custom-manifest.json` `images` entries into `/admin`, or call `POST /api/media`.

## Production recommendation

Current storage mode is filesystem-backed JSON for development velocity.
For production at scale, keep this API contract and swap backend persistence to:

- Object storage + CDN for files (`S3`, `R2`, `Cloudinary`).
- SQL/NoSQL database for metadata.
- Background worker for variant generation and optimization.
