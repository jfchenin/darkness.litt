#!/bin/bash

# Test script for Formspark webhook endpoint
# Usage: ./scripts/test-webhook.sh [environment]
# Example: ./scripts/test-webhook.sh production
# Example: ./scripts/test-webhook.sh local

set -e

ENVIRONMENT=${1:-production}

if [ "$ENVIRONMENT" = "local" ]; then
  BASE_URL="http://localhost:4321"
else
  BASE_URL="https://darkness.chenin.fr"
fi

WEBHOOK_URL="${BASE_URL}/api/formspark-webhook"

echo "🧪 Testing Formspark Webhook"
echo "================================"
echo "Environment: $ENVIRONMENT"
echo "URL: $WEBHOOK_URL"
echo ""

# Test 1: Valid submission with newsletter consent
echo "📧 Test 1: With newsletter consent"
echo "-----------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "fullName": "Jean Dupont",
    "message": "This is a test message",
    "consent": true,
    "newsletterConsent": true
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Test 2: Valid submission without newsletter consent
echo "📧 Test 2: Without newsletter consent"
echo "--------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "fullName": "Marie Martin",
    "message": "Another test message",
    "consent": true,
    "newsletterConsent": false
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Test 3: Missing email
echo "📧 Test 3: Missing email (should fail)"
echo "---------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "No Email",
    "message": "This should fail",
    "consent": true,
    "newsletterConsent": true
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Test 4: Newsletter consent with string value "true"
echo "📧 Test 4: Newsletter consent as string 'true'"
echo "-----------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test3@example.com",
    "fullName": "Pierre Bernard",
    "message": "Test with string true",
    "consent": true,
    "newsletterConsent": "true"
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

# Test 5: Newsletter consent with checkbox value "on"
echo "📧 Test 5: Newsletter consent as 'on' (checkbox)"
echo "-------------------------------------------------"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test4@example.com",
    "fullName": "Sophie Laurent",
    "message": "Test with checkbox on",
    "consent": true,
    "newsletterConsent": "on"
  }')

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")

echo "Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

echo "✅ Tests completed!"
echo ""
echo "Expected results:"
echo "- Test 1: 200 OK, contact added to newsletter"
echo "- Test 2: 200 OK, no newsletter subscription"
echo "- Test 3: 400 Bad Request, invalid data"
echo "- Test 4: 200 OK, contact added to newsletter"
echo "- Test 5: 200 OK, contact added to newsletter"