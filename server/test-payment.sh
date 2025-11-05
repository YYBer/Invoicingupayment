#!/bin/bash

# Test Payment API Script
# Usage: ./test-payment.sh [transaction_hash]

BASE_URL="http://localhost:3001"

echo "==================================="
echo "Payment Backend Test Script"
echo "==================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s $BASE_URL/health | jq '.'
echo ""
echo ""

# Test 2: API Info
echo "2. Testing API Info..."
curl -s $BASE_URL/ | jq '.'
echo ""
echo ""

# Test 3: Submit Payment
if [ -z "$1" ]; then
  TX_HASH="test_$(date +%s)"
  echo "3. Submitting TEST transaction (no real blockchain check)..."
else
  TX_HASH="$1"
  echo "3. Submitting REAL transaction hash..."
fi

SUBMIT_RESULT=$(curl -s -X POST $BASE_URL/api/payment/submit \
  -H "Content-Type: application/json" \
  -d "{\"transactionHash\":\"$TX_HASH\"}")

echo "$SUBMIT_RESULT" | jq '.'
echo ""
echo ""

# Test 4: Check Status (poll 5 times)
echo "4. Checking payment status (5 times, 3 seconds apart)..."
for i in {1..5}; do
  echo "Attempt $i:"
  STATUS=$(curl -s $BASE_URL/api/payment/status/$TX_HASH)
  echo "$STATUS" | jq '.'

  # Check if confirmed
  if echo "$STATUS" | jq -e '.payment.status == "confirmed"' > /dev/null; then
    echo ""
    echo "✅ PAYMENT CONFIRMED!"
    break
  fi

  if [ $i -lt 5 ]; then
    echo "Waiting 3 seconds..."
    sleep 3
    echo ""
  fi
done

echo ""
echo ""

# Test 5: View All Payments
echo "5. Viewing all payments..."
curl -s $BASE_URL/api/payment/all | jq '.'

echo ""
echo "==================================="
echo "Test Complete!"
echo "==================================="
