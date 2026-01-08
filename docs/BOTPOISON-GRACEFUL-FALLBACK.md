# Botpoison Graceful Fallback Implementation

## Overview

This document describes the graceful fallback implementation for Botpoison integration. The system now allows form submissions to succeed even when Botpoison service is unavailable, ensuring users are never blocked from contacting you.

## Problem Statement

Botpoison API has shown intermittent issues:
- 502 Bad Gateway errors from `api.botpoison.com/challenge`
- CORS errors when calling from browser
- "Invalid key" errors despite valid keys
- Service unavailability blocking all form submissions

## Solution: Graceful Degradation

The implementation now follows a **graceful degradation** pattern:

1. ✅ **Try** to use Botpoison for bot protection
2. ⚠️ **If it fails**, log the error and continue anyway
3. ✅ **Always** allow legitimate users to submit forms
4. 📊 **Track** which submissions bypassed bot protection

## Implementation Details

### 1. Frontend (ContactForm.astro)

**Location**: Lines 264-275

```typescript
// Try to get Botpoison solution with graceful fallback
try {
  const solution = await getBotpoisonSolution()
  data._botpoison = solution
  console.log('✓ Botpoison verification successful')
}
catch (error) {
  // Graceful fallback - allow submission without Botpoison
  console.warn('⚠️ Botpoison unavailable, submitting without bot protection:', error)
  data._botpoison = 'SERVICE_UNAVAILABLE'
  data._botpoison_error = error instanceof Error ? error.message : 'Unknown error'
  // Continue with submission - don't block users
}
```

**Behavior**:
- Attempts to generate Botpoison solution
- If fails (network error, API down, CORS, etc.), continues anyway
- Sends special marker `SERVICE_UNAVAILABLE` to backend
- User experience is **never blocked**

### 2. Backend (contact.ts)

**Location**: Lines 45-120

```typescript
// Check if Botpoison is available or if graceful fallback is needed
if (body._botpoison === 'SERVICE_UNAVAILABLE') {
  // Graceful fallback - Botpoison service was unavailable
  console.warn('⚠️ Form submitted without Botpoison verification (service unavailable)')
  console.warn('Submission details:', {
    email: body.email,
    error: body._botpoison_error,
    timestamp: new Date().toISOString(),
  })
  // Continue to Formspark without verification
}
else if (!body._botpoison) {
  return new Response(
    JSON.stringify({ error: 'Vérification anti-bot manquante' }),
    { status: 400, headers: { 'Content-Type': 'application/json' } }
  )
}
else {
  // Normal Botpoison verification flow
  try {
    const botpoisonResponse = await fetch('https://api.botpoison.com/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secretKey,
        solution: body._botpoison,
      }),
    })

    const botpoisonData = await botpoisonResponse.json()

    if (!botpoisonData.ok) {
      console.warn('Botpoison verification failed:', botpoisonData.message)
      return new Response(
        JSON.stringify({ error: 'Vérification anti-bot échouée' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
  catch (verifyError) {
    // If verification fails, log but allow submission (graceful degradation)
    console.error('Botpoison verification error:', verifyError)
    console.warn('Allowing submission despite verification error')
  }
}
```

**Behavior**:
- Recognizes `SERVICE_UNAVAILABLE` marker from frontend
- Logs the bypass for monitoring
- Continues to Formspark submission
- Also handles verification API failures gracefully

### 3. Backend Challenge Generation (botpoison-challenge.ts)

**Purpose**: Generates Botpoison challenges server-side to avoid CORS issues

**Behavior**:
- Calls Botpoison API from server (no CORS)
- Returns challenge to browser
- Browser solves challenge using Web Crypto API
- If this fails, graceful fallback kicks in

### 4. Challenge Solving (botpoisonUtils.ts)

**Implementation**: Custom Web Crypto API implementation

```typescript
async function solveChallenge(payload: any, signature: string): Promise<string> {
  const { nonce, difficulty } = payload

  let solution = 0
  const encoder = new TextEncoder()

  while (true) {
    const data = encoder.encode(`${nonce}${solution}`)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = new Uint8Array(hashBuffer)

    // Check if hash meets difficulty requirement
    let leadingZeros = 0
    for (const byte of hashArray) {
      if (byte === 0) {
        leadingZeros += 8
      }
      else {
        leadingZeros += Math.clz32(byte) - 24
        break
      }
    }

    if (leadingZeros >= difficulty) {
      return JSON.stringify({ payload: { ...payload, solution }, signature })
    }

    solution++

    // Safety limit to prevent infinite loops
    if (solution > 10000000) {
      throw new Error('Challenge solving timeout')
    }
  }
}
```

**Behavior**:
- Implements proof-of-work algorithm
- Uses SHA-256 hashing
- Finds solution meeting difficulty requirement
- Has timeout safety mechanism

## Flow Diagram

```
User submits form
       ↓
Validate form fields
       ↓
Try to get Botpoison solution
       ↓
   ┌───┴───┐
   │       │
Success   Failure
   │       │
   │       ↓
   │   Set _botpoison = 'SERVICE_UNAVAILABLE'
   │   Log warning
   │   Continue anyway
   │       │
   └───┬───┘
       ↓
Submit to /api/contact
       ↓
Backend checks _botpoison value
       ↓
   ┌───┴───┐
   │       │
Normal  SERVICE_UNAVAILABLE
   │       │
Verify   Skip verification
   │    Log bypass
   │       │
   └───┬───┘
       ↓
Forward to Formspark
       ↓
Send confirmation to user
```

## Monitoring

### What Gets Logged

**Frontend Console**:
```
✓ Botpoison verification successful
```
OR
```
⚠️ Botpoison unavailable, submitting without bot protection: Error: ...
```

**Backend Console**:
```
⚠️ Form submitted without Botpoison verification (service unavailable)
Submission details: { email: '...', error: '...', timestamp: '...' }
```

### Formspark Data

Submissions without bot protection include:
```json
{
  "fullName": "John Doe",
  "email": "john@example.com",
  "message": "...",
  "consent": true,
  "newsletterConsent": false,
  "_note": "Submitted without bot protection (service unavailable)"
}
```

## Testing

### Test Graceful Fallback Locally

1. **Simulate Botpoison failure** by temporarily breaking the API call:
   ```typescript
   // In botpoisonUtils.ts
   export async function getBotpoisonSolution(): Promise<string> {
     throw new Error('Simulated failure') // Add this line
   }
   ```

2. **Submit the form** - it should succeed with warning in console

3. **Check backend logs** - should see "SERVICE_UNAVAILABLE" handling

4. **Check Formspark** - submission should include `_note` field

### Test Normal Flow

1. Remove the simulated failure
2. Submit form normally
3. Should see "✓ Botpoison verification successful"
4. Submission should be verified and marked "solved" in Botpoison dashboard

## Benefits

✅ **Users never blocked**: Form always submits successfully
✅ **Bot protection when available**: Still uses Botpoison when working
✅ **Monitoring**: Logs track which submissions bypassed protection
✅ **Graceful degradation**: System works even during Botpoison outages
✅ **Better UX**: No frustrating "security check failed" messages

## Trade-offs

⚠️ **Reduced bot protection**: When Botpoison is down, no bot filtering
⚠️ **Potential spam**: Might receive more spam during outages
⚠️ **Manual review**: May need to review unverified submissions

## Mitigation Strategies

### 1. Honeypot Field (Optional)

Add a hidden field to catch basic bots:

```html
<!-- In ContactForm.astro -->
<input
  type="text"
  name="website"
  id="website"
  value=""
  style="position: absolute; left: -9999px;"
  tabindex="-1"
  autocomplete="off"
  aria-hidden="true"
/>
```

```typescript
// In API endpoint
if (body.website) {
  return new Response(
    JSON.stringify({ error: 'Invalid submission' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  )
}
```

### 2. Rate Limiting

Use Cloudflare's built-in rate limiting to prevent spam floods.

### 3. Email Notifications

Monitor for unusual submission patterns when Botpoison is unavailable.

### 4. Alternative Bot Protection

Consider adding Cloudflare Turnstile as a backup:
- More reliable (native to Cloudflare)
- Free tier available
- Can be used alongside Botpoison

## Recommendations

1. **Keep graceful fallback enabled** - User experience is priority
2. **Monitor Botpoison dashboard** - Check success rate
3. **Review unverified submissions** - Look for spam patterns
4. **Consider backup protection** - Honeypot or rate limiting
5. **Contact Botpoison support** - Report persistent API issues

## Files Modified

- `src/components/Forms/ContactForm.astro` - Added graceful fallback in form submit
- `src/pages/api/contact.ts` - Handle SERVICE_UNAVAILABLE marker
- `src/utils/botpoisonUtils.ts` - Backend challenge generation approach
- `src/pages/api/botpoison-challenge.ts` - Server-side challenge endpoint

## Environment Variables Required

```bash
# .env
PUBLIC_BOTPOISON_PUBLIC_KEY=pk_your_public_key
BOTPOISON_SECRET_KEY=sk_your_secret_key
PUBLIC_FORMSPARK_FORM_ID=https://submit-form.com/your_id
```

## Deployment

1. Ensure all environment variables are set in Cloudflare Pages
2. Deploy: `pnpm build && wrangler deploy`
3. Test form submission in production
4. Monitor logs for any issues

## Troubleshooting

### Issue: All submissions show SERVICE_UNAVAILABLE

**Cause**: Botpoison API endpoint is consistently failing

**Solution**:
1. Check Botpoison service status
2. Verify PUBLIC_BOTPOISON_PUBLIC_KEY is correct
3. Test API directly: `curl -X POST https://api.botpoison.com/challenge -H "Content-Type: application/json" -d '{"publicKey":"pk_your_key"}'`

### Issue: Forms not submitting at all

**Cause**: API endpoint error or Formspark configuration

**Solution**:
1. Check browser console for errors
2. Check backend logs
3. Verify PUBLIC_FORMSPARK_FORM_ID is correct

### Issue: Receiving too much spam

**Cause**: Botpoison unavailable for extended period

**Solution**:
1. Implement honeypot field
2. Enable Cloudflare rate limiting
3. Consider alternative bot protection
4. Manually moderate submissions

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Status**: ✅ Production Ready
