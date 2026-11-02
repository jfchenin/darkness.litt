// admin/src/pages/api/media.ts
import type { APIRoute } from 'astro'
import { MAX_JPEG_BYTES } from '../../../../shared/article-image'
import { assertUploadableJpeg } from '../../lib/jpeg-upload'

export const prerender = false

const json = (body: unknown, status = 200) => Response.json(body, { status })

// Lists every stored key (admin-only: the public media host has no listing).
export const GET: APIRoute = async ({ locals }) => {
  const keys: string[] = []
  let cursor: string | undefined
  do {
    const page = await locals.runtime.env.MEDIA.list({ cursor })
    keys.push(...page.objects.map(object => object.key))
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  return json({ keys })
}

// Stores a new JPEG at `key` (query `key`, header `x-media-key`, or multipart fields `key` + `file`). Never overwrites.
export const POST: APIRoute = async ({ request, url, locals }) => {
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) {
    return json({ error: 'forbidden' }, 403)
  }

  const declaredLength = Number(request.headers.get('content-length'))
  if (declaredLength > MAX_JPEG_BYTES + 1024 * 1024) {
    return json({ error: 'too large' }, 400)
  }

  let key = url.searchParams.get('key') ?? request.headers.get('x-media-key') ?? ''
  let bytes: Uint8Array
  if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) {
      return json({ error: 'missing file' }, 400)
    }
    key = key || String(form.get('key') ?? '')
    bytes = new Uint8Array(await file.arrayBuffer())
  }
  else {
    bytes = new Uint8Array(await request.arrayBuffer())
  }

  const check = assertUploadableJpeg(key, bytes)
  if (!check.ok) {
    return json({ error: check.error }, check.status)
  }

  const { MEDIA } = locals.runtime.env
  if (await MEDIA.head(key)) {
    return json({ error: 'already exists' }, 409)
  }
  await MEDIA.put(key, bytes, { httpMetadata: { contentType: 'image/jpeg' } })
  return json({ key }, 201)
}
