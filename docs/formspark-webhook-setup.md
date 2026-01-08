# Formspark Webhook Setup Guide

## Overview

This guide explains how to set up the Formspark webhook integration that automatically adds contacts to Brevo when users consent to the newsletter.

## Architecture Flow

```
User fills contact form
    ↓
Frontend submits to /api/contact
    ↓
/api/contact verifies Botpoison
    ↓
/api/contact forwards to Formspark
    ↓
Formspark stores submission
    ↓
Formspark triggers webhook → https://darkness.chenin.fr/api/formspark-webhook
    ↓
Webhook checks newsletterConsent
    ↓
If newsletterConsent = true
    ↓
POST → https://api.brevo.com/v3/contacts
    ↓
Contact added to Brevo newsletter list ✅
```

## Setup Steps

### 1. Configure Environment Variables

Add the following environment variables to your Cloudflare Pages/Workers dashboard:

#### Required Variables

- `BREVO_API_KEY` - Your Brevo (Sendinblue) API key
  - Get it from: https://app.brevo.com/settings/keys/api
  - Example: `xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

#### Optional Variables

- `BREVO_LIST_ID` - The ID of your Brevo contact list (default: 2)
  - Find it in Brevo dashboard under Contacts > Lists
  - Example: `2`

#### Existing Variables (already configured)

- `BOTPOISON_SECRET_KEY` - For bot verification
- `PUBLIC_BOTPOISON_PUBLIC_KEY` - Public key for client-side
- `PUBLIC_FORMSPARK_FORM_ID` - Formspark form endpoint URL

### 2. Configure Formspark Webhook

1. Go to your Formspark dashboard: https://dashboard.formspark.io
2. Select your form (ID: `7ekPu7Hos` or current form)
3. Navigate to **Settings** → **Webhooks**
4. Add a new webhook:
   - **URL**: `https://darkness.chenin.fr/api/formspark-webhook`
   - **Method**: POST
   - **Content-Type**: application/json
   - **Events**: Form submission
5. Save the webhook configuration

### 3. Disable Botpoison in Formspark (if enabled)

Since we handle Botpoison verification server-side in `/api/contact`, you should disable Botpoison integration in Formspark to avoid conflicts:

1. In Formspark dashboard, go to your form settings
2. Navigate to **Integrations** → **Botpoison**
3. If enabled, disable it
4. This prevents double verification and token conflicts

### 4. Deploy Changes

After adding environment variables:

```bash
# Rebuild and redeploy
pnpm build
pnpm deploy
```

Or trigger a redeploy in Cloudflare Pages dashboard.

## Testing

### Test the Webhook Endpoint Directly

```bash
curl -X POST https://darkness.chenin.fr/api/formspark-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Test User",
    "newsletterConsent": true,
    "message": "Test message"
  }'
```

Expected response when newsletter consent is true:
```json
{
  "success": true,
  "message": "Contact added to newsletter",
  "brevoId": 123
}
```

Expected response when newsletter consent is false:
```json
{
  "success": true,
  "message": "Webhook received, no newsletter subscription requested"
}
```

### Test the Full Flow

1. Go to your contact form: https://darkness.chenin.fr/contact
2. Fill out the form with a valid email
3. Check the "Subscribe to newsletter" checkbox
4. Submit the form
5. Verify in Brevo dashboard that the contact was added

## Webhook Behavior

### When `newsletterConsent` is true

- Contact is added to Brevo with email and first name
- If contact already exists, it's updated (due to `updateEnabled: true`)
- Returns success response

### When `newsletterConsent` is false or missing

- No action taken on Brevo
- Returns acknowledgment response
- Form submission still stored in Formspark

### Error Handling

The webhook handles several scenarios gracefully:

- **Missing email**: Returns 400 error
- **Brevo API key not configured**: Returns 500 error (but acknowledges receipt)
- **Contact already exists in Brevo**: Returns success (not an error)
- **Brevo API failure**: Returns 500 error with details
- **Network errors**: Returns 500 error with details

## Data Mapping

### From Formspark to Brevo

| Form Field | Brevo Field | Notes |
|------------|-------------|-------|
| `email` | `email` | Required, unique identifier |
| `fullName` | `attributes.FIRSTNAME` | First word extracted as first name |
| `newsletterConsent` | N/A | Used to determine if contact should be added |

### Supported Values for `newsletterConsent`

The webhook accepts multiple formats:
- Boolean: `true`
- String: `"true"`, `"on"`
- Checkbox: `"on"` (standard HTML checkbox value)

## Monitoring

### Check Webhook Logs

In Cloudflare dashboard:
1. Go to Workers & Pages
2. Select your project
3. Click on **Logs** tab
4. Filter for `/api/formspark-webhook`

### Check Formspark Logs

In Formspark dashboard:
1. Go to your form
2. Click on **Submissions** to see all form data
3. Click on **Webhooks** → **Logs** to see webhook delivery status

### Check Brevo Contacts

In Brevo dashboard:
1. Go to **Contacts**
2. Filter by list ID (default: 2)
3. Verify new contacts appear after form submissions

## Troubleshooting

### Webhook Not Receiving Data

1. Check Formspark webhook configuration
2. Verify webhook URL is correct: `https://darkness.chenin.fr/api/formspark-webhook`
3. Check Formspark webhook logs for delivery errors
4. Verify endpoint is accessible: `curl https://darkness.chenin.fr/api/formspark-webhook`

### Contacts Not Added to Brevo

1. Verify `BREVO_API_KEY` is configured correctly
2. Check Cloudflare logs for Brevo API errors
3. Verify Brevo list ID is correct
4. Test Brevo API key manually:
   ```bash
   curl https://api.brevo.com/v3/account \
     -H "api-key: YOUR_API_KEY"
   ```

### "Contact Already Exists" Errors

This is normal behavior. The webhook:
- Treats this as success (not an error)
- Updates existing contact if needed
- Returns success response

### Newsletter Consent Not Working

1. Verify form field name is exactly `newsletterConsent`
2. Check form submission data in Formspark dashboard
3. Verify checkbox sends `true`, `"true"`, or `"on"` value

## Security Considerations

### Webhook Authentication (Optional Enhancement)

Currently, the webhook accepts any POST request. For production, consider:

1. **Formspark Signature Verification**: Verify requests come from Formspark
2. **IP Allowlisting**: Restrict to Formspark IP addresses
3. **Secret Token**: Add a secret token in webhook URL query params

Example with secret token:
```typescript
export const POST: APIRoute = async ({ request, url }) => {
  const secretToken = url.searchParams.get('token')
  if (secretToken !== import.meta.env.WEBHOOK_SECRET_TOKEN) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... rest of code
}
```

Then configure webhook URL as:
```
https://darkness.chenin.fr/api/formspark-webhook?token=YOUR_SECRET_TOKEN
```

### Data Privacy

- Only email and first name are sent to Brevo
- Full message content is NOT sent to Brevo (stays in Formspark)
- GDPR compliant: requires explicit consent checkbox

## API Reference

### POST /api/formspark-webhook

Receives form submissions from Formspark and optionally adds contacts to Brevo.

#### Request Body

```typescript
{
  email: string           // Required
  fullName?: string       // Optional
  message?: string        // Optional
  consent?: boolean       // Optional
  newsletterConsent?: boolean | string  // Optional
}
```

#### Response (Success with Newsletter)

```json
{
  "success": true,
  "message": "Contact added to newsletter",
  "brevoId": 123
}
```

#### Response (Success without Newsletter)

```json
{
  "success": true,
  "message": "Webhook received, no newsletter subscription requested"
}
```

#### Response (Error)

```json
{
  "error": "Error description",
  "details": "Additional error information"
}
```

## Related Files

- `/src/pages/api/formspark-webhook.ts` - Webhook endpoint implementation
- `/src/pages/api/contact.ts` - Contact form API endpoint
- `/src/components/Forms/ContactForm.astro` - Frontend contact form
- `/docs/botpoison-integration.md` - Botpoison integration documentation

## Brevo API Documentation

- API Reference: https://developers.brevo.com/reference/createcontact
- Getting Started: https://developers.brevo.com/docs
- API Keys: https://app.brevo.com/settings/keys/api