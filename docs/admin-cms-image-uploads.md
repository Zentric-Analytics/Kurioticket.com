# Admin Content image uploads

The Admin Content editors for **Homepage Destinations**, **Flight Routes**, and **Hotel Destinations** support a local JPG, PNG or WebP image upload (maximum 5 MB). FAQ records do not need images.

## One-time setup in Render

Uploads require persistent, private S3-compatible storage. The implementation targets **Cloudflare R2** via its S3 API and does not store uploaded files on Render's ephemeral web filesystem.

1. Create a private R2 bucket, e.g. `kurioticket-cms-staging` for staging. Use a separate bucket for production.
2. Create an R2 API token with **Object Read and Write** privileges **scoped only to that bucket**. Do not use an account-wide token.
3. In the corresponding Render web service's secret environment variables, configure:
   - `CMS_R2_ACCOUNT_ID` — 32-character Cloudflare account ID.
   - `CMS_R2_BUCKET` — R2 bucket name.
   - `CMS_R2_ACCESS_KEY_ID` — scoped R2 API token access key.
   - `CMS_R2_SECRET_ACCESS_KEY` — scoped R2 API token secret.
4. Redeploy that web service after setting the secrets. Never commit these secrets to GitHub, client code, or a public Render Blueprint.
5. Repeat separately for production only when ready. Staging and production must use different R2 buckets and ideally different scoped tokens.

When these values are missing or invalid, the upload endpoint returns an actionable configuration error. Existing URL-only editing and published images continue to work. The repository does **not** create a bucket or provision paid infrastructure.

## Editor workflow

1. Open a destination or flight route editor.
2. Choose **Upload image** or **Replace with upload** and select a local JPG, PNG or WebP file.
3. Wait for the upload confirmation. A same-origin `/api/cms/images/<uuid>.<ext>` URL is inserted into the Image URL field.
4. Enter or check **Image alt text** and verify the existing draft preview.
5. **Save Draft**, then explicitly **Publish** to update the public card. Uploading never publishes a draft automatically.
6. You may also paste an already-approved image URL as before.

## Security and persistence

- Only verified active administrators can upload; the endpoint rejects cross-origin browser requests.
- The server consumes the request body with a 5 MB bound, checks JPEG/PNG/WebP signatures against declared MIME types, and rejects unsupported or empty files.
- Each upload receives an unpredictable UUID filename. Image reads accept only that filename grammar; no user-supplied storage keys, file paths, storage endpoints or bucket names are trusted.
- S3 requests are signed server-side using AWS SigV4. R2 credentials never reach a browser. The bucket stays private; the site serves uploaded images through same-origin URLs.
- Uploaded files remain in R2 across Render rebuilds, restarts, and deployments. The public delivery route serves correct Content-Type and `nosniff` with long-lived immutable caching.
- Upload actions are recorded in the existing admin audit log.
- Uploading does not change the CMS draft or published content until the editor's existing Save Draft/Publish actions.
- This first phase does not add image deletion or a reusable media library; deleting R2 objects while published cards may reference them is intentionally not exposed.
- Before using images publicly, confirm ownership/commercial licensing and ensure suitable crops and accessible alt text.

## Verification

On staging, with credentials configured: upload JPG, PNG and WebP under 5 MB, verify a new preview, Save Draft and Publish. Ensure the image still loads after redeploy. Verify missing storage config, invalid MIME, overly large file, existing remote image URL, and the current published card until publish.
