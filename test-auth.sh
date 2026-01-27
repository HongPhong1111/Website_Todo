#!/bin/bash

echo "=== Testing Admin Login ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@todo.local","password":"admin123"}')

echo "Login Response: $LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:50}..."

echo ""
echo "=== Testing Admin Dashboard ==="
DASHBOARD_RESPONSE=$(curl -s -X GET http://localhost:4000/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN")

echo "Dashboard Response: $DASHBOARD_RESPONSE"

if echo "$DASHBOARD_RESPONSE" | grep -q '"users":'; then
  echo "✅ Admin dashboard accessible"
else
  echo "❌ Admin dashboard failed"
fi

echo ""
echo "=== Testing Regular User Access ==="
DASHBOARD_RESPONSE2=$(curl -s -X GET http://localhost:4000/api/admin/dashboard \
  -H "Authorization: Bearer invalid_token")

if echo "$DASHBOARD_RESPONSE2" | grep -q '"Invalid token"'; then
  echo "✅ Admin protection working"
else
  echo "❌ Admin protection failed"
fi
