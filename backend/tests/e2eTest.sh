#!/bin/bash

# Comprehensive E2E Test - Simulating ALL Frontend Buttons
# Uses Admin: admin@realestate.com / password123

BASE_URL="http://localhost:3001/api"
PASSED=0
FAILED=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1 - $2"
  ((FAILED++))
}

test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  local expected_status=${5:-200}

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data")
  fi

  status_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    log_pass "$description"
    echo "$body"
  else
    log_fail "$description" "Status: $status_code, Response: $body"
    echo ""
  fi
}

echo "=========================================="
echo "   COMPREHENSIVE E2E TEST SUITE"
echo "   Testing ALL Frontend Features"
echo "=========================================="
echo ""

# 1. LOGIN
echo -e "${YELLOW}[1] AUTHENTICATION${NC}"
echo "-------------------------------------------"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@realestate.com","password":"password123"}')
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  log_pass "Login as admin@realestate.com"
else
  log_fail "Login" "Failed to get token"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

# Get current user
test_endpoint "GET" "/auth/me" "" "Get current user profile"

echo ""
echo -e "${YELLOW}[2] DASHBOARD${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/dashboard/overview" "" "Dashboard Overview"
test_endpoint "GET" "/dashboard/activities?limit=10" "" "Dashboard Activities"
test_endpoint "GET" "/dashboard/tasks?limit=10" "" "Dashboard Tasks"
test_endpoint "GET" "/dashboard/showings?limit=10" "" "Dashboard Showings"
test_endpoint "GET" "/dashboard/lead-stats" "" "Dashboard Lead Stats"
test_endpoint "GET" "/dashboard/performance?period=monthly" "" "Dashboard Performance"
test_endpoint "GET" "/dashboard/pipeline" "" "Dashboard Pipeline"

echo ""
echo -e "${YELLOW}[3] PROPERTIES${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/properties" "" "List all properties"
test_endpoint "GET" "/properties/stats/overview" "" "Property stats"

# Get a property ID for later tests
PROPERTY_ID=$(curl -s "$BASE_URL/properties" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Using Property ID: $PROPERTY_ID"

if [ -n "$PROPERTY_ID" ]; then
  test_endpoint "GET" "/properties/$PROPERTY_ID" "" "Get property by ID"
fi

# Create a new property (simulates "Add Property" button)
echo ""
echo "Creating new property..."
NEW_PROPERTY=$(curl -s -X POST "$BASE_URL/properties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Test Street",
    "city": "Test City",
    "state": "TX",
    "zipCode": "12345",
    "propertyType": "SINGLE_FAMILY",
    "listPrice": 500000,
    "bedrooms": 4,
    "bathrooms": 3,
    "squareFeet": 2500,
    "lotSize": 0.25,
    "yearBuilt": 2020,
    "status": "ACTIVE",
    "description": "Beautiful test property"
  }')

NEW_PROPERTY_ID=$(echo "$NEW_PROPERTY" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_PROPERTY_ID" ]; then
  log_pass "Create new property"
  echo "New Property ID: $NEW_PROPERTY_ID"
else
  log_fail "Create new property" "$NEW_PROPERTY"
fi

# Update property
if [ -n "$NEW_PROPERTY_ID" ]; then
  test_endpoint "PUT" "/properties/$NEW_PROPERTY_ID" '{"listPrice": 525000}' "Update property"
fi

echo ""
echo -e "${YELLOW}[4] LEADS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/leads" "" "List all leads"
test_endpoint "GET" "/leads/stats/overview" "" "Lead stats"

# Get a lead ID
LEAD_ID=$(curl -s "$BASE_URL/leads" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Using Lead ID: $LEAD_ID"

if [ -n "$LEAD_ID" ]; then
  test_endpoint "GET" "/leads/$LEAD_ID" "" "Get lead by ID"
  test_endpoint "GET" "/leads/$LEAD_ID/activities" "" "Get lead activities"
fi

# Create new lead (simulates "Add Lead" button)
echo ""
echo "Creating new lead..."
NEW_LEAD=$(curl -s -X POST "$BASE_URL/leads" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "Lead",
    "email": "testlead@example.com",
    "phone": "555-0123",
    "status": "NEW"
  }')

NEW_LEAD_ID=$(echo "$NEW_LEAD" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_LEAD_ID" ]; then
  log_pass "Create new lead"
  echo "New Lead ID: $NEW_LEAD_ID"
else
  log_fail "Create new lead" "$NEW_LEAD"
fi

# Update lead
if [ -n "$NEW_LEAD_ID" ]; then
  test_endpoint "PUT" "/leads/$NEW_LEAD_ID" '{"status": "CONTACTED"}' "Update lead status"
  test_endpoint "POST" "/leads/$NEW_LEAD_ID/activities" '{"type": "EMAIL", "description": "Sent intro email"}' "Add lead activity"
fi

echo ""
echo -e "${YELLOW}[5] TRANSACTIONS - THE CRITICAL FLOW${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/transactions" "" "List all transactions"
test_endpoint "GET" "/transactions/stats/overview" "" "Transaction stats"

# Get a transaction ID
TRANSACTION_ID=$(curl -s "$BASE_URL/transactions" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Using Transaction ID: $TRANSACTION_ID"

if [ -n "$TRANSACTION_ID" ]; then
  test_endpoint "GET" "/transactions/$TRANSACTION_ID" "" "Get transaction by ID"
fi

# CREATE NEW TRANSACTION - This is what the user was having trouble with!
echo ""
echo -e "${YELLOW}Creating new transaction (critical test)...${NC}"

# First, we need a property and a lead
ACTIVE_PROPERTY_ID=$(curl -s "$BASE_URL/properties?status=ACTIVE" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
ACTIVE_LEAD_ID=$(curl -s "$BASE_URL/leads" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

echo "Using Property ID: $ACTIVE_PROPERTY_ID"
echo "Using Lead ID: $ACTIVE_LEAD_ID"

if [ -n "$ACTIVE_PROPERTY_ID" ]; then
  NEW_TRANSACTION=$(curl -s -X POST "$BASE_URL/transactions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"propertyId\": \"$ACTIVE_PROPERTY_ID\",
      \"leadId\": \"$ACTIVE_LEAD_ID\",
      \"type\": \"BUYER\",
      \"status\": \"INITIATED\",
      \"listPrice\": 450000,
      \"buyerName\": \"Test Buyer\",
      \"buyerEmail\": \"buyer@test.com\",
      \"buyerPhone\": \"555-1234\"
    }")

  NEW_TRANSACTION_ID=$(echo "$NEW_TRANSACTION" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  if [ -n "$NEW_TRANSACTION_ID" ]; then
    log_pass "CREATE NEW TRANSACTION (critical)"
    echo "New Transaction ID: $NEW_TRANSACTION_ID"
    echo "Response: $NEW_TRANSACTION"
  else
    log_fail "CREATE NEW TRANSACTION (critical)" "$NEW_TRANSACTION"
  fi

  # Update transaction
  if [ -n "$NEW_TRANSACTION_ID" ]; then
    test_endpoint "PUT" "/transactions/$NEW_TRANSACTION_ID" '{"status": "UNDER_CONTRACT"}' "Update transaction status"
  fi
else
  log_fail "CREATE NEW TRANSACTION" "No active property available"
fi

echo ""
echo -e "${YELLOW}[6] AGENTS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/agents" "" "List all agents"

AGENT_ID=$(curl -s "$BASE_URL/agents" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Using Agent ID: $AGENT_ID"

if [ -n "$AGENT_ID" ]; then
  test_endpoint "GET" "/agents/$AGENT_ID" "" "Get agent by ID"
  test_endpoint "GET" "/agents/$AGENT_ID/leads" "" "Get agent leads"
  test_endpoint "GET" "/agents/$AGENT_ID/properties" "" "Get agent properties"
  test_endpoint "GET" "/agents/$AGENT_ID/transactions" "" "Get agent transactions"
  test_endpoint "GET" "/agents/$AGENT_ID/stats" "" "Get agent stats"
  test_endpoint "GET" "/agents/$AGENT_ID/performance" "" "Get agent performance"
  test_endpoint "GET" "/agents/$AGENT_ID/training" "" "Get agent training"
fi

echo ""
echo -e "${YELLOW}[7] TEAMS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/teams" "" "List all teams"

TEAM_ID=$(curl -s "$BASE_URL/teams" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
echo "Using Team ID: $TEAM_ID"

if [ -n "$TEAM_ID" ]; then
  test_endpoint "GET" "/teams/$TEAM_ID" "" "Get team by ID"
  test_endpoint "GET" "/teams/$TEAM_ID/performance" "" "Get team performance"
fi

# Create new team
echo ""
echo "Creating new team..."
NEW_TEAM=$(curl -s -X POST "$BASE_URL/teams" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Team", "description": "A test team"}')

NEW_TEAM_ID=$(echo "$NEW_TEAM" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_TEAM_ID" ]; then
  log_pass "Create new team"
  echo "New Team ID: $NEW_TEAM_ID"
else
  log_fail "Create new team" "$NEW_TEAM"
fi

echo ""
echo -e "${YELLOW}[8] SHOWINGS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/showings" "" "List all showings"
test_endpoint "GET" "/showings/today/list" "" "Today's showings"
test_endpoint "GET" "/showings/upcoming/list" "" "Upcoming showings"

SHOWING_ID=$(curl -s "$BASE_URL/showings" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$SHOWING_ID" ]; then
  test_endpoint "GET" "/showings/$SHOWING_ID" "" "Get showing by ID"
fi

# Create new showing
if [ -n "$ACTIVE_PROPERTY_ID" ] && [ -n "$ACTIVE_LEAD_ID" ]; then
  TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d 2>/dev/null)
  NEW_SHOWING=$(curl -s -X POST "$BASE_URL/showings" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"propertyId\": \"$ACTIVE_PROPERTY_ID\",
      \"leadId\": \"$ACTIVE_LEAD_ID\",
      \"date\": \"$TOMORROW\",
      \"time\": \"14:00\",
      \"duration\": 60
    }")

  NEW_SHOWING_ID=$(echo "$NEW_SHOWING" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  if [ -n "$NEW_SHOWING_ID" ]; then
    log_pass "Create new showing"
  else
    log_fail "Create new showing" "$NEW_SHOWING"
  fi
fi

echo ""
echo -e "${YELLOW}[9] TASKS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/tasks" "" "List all tasks"
test_endpoint "GET" "/tasks/today/list" "" "Today's tasks"
test_endpoint "GET" "/tasks/overdue/list" "" "Overdue tasks"

TASK_ID=$(curl -s "$BASE_URL/tasks" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$TASK_ID" ]; then
  test_endpoint "GET" "/tasks/$TASK_ID" "" "Get task by ID"
fi

# Create new task
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d 2>/dev/null)
NEW_TASK=$(curl -s -X POST "$BASE_URL/tasks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Test Task\",
    \"description\": \"A test task\",
    \"priority\": \"HIGH\",
    \"dueDate\": \"$TOMORROW\"
  }")

NEW_TASK_ID=$(echo "$NEW_TASK" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_TASK_ID" ]; then
  log_pass "Create new task"
  test_endpoint "POST" "/tasks/$NEW_TASK_ID/complete" "" "Complete task"
else
  log_fail "Create new task" "$NEW_TASK"
fi

echo ""
echo -e "${YELLOW}[10] OPEN HOUSES${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/open-houses" "" "List all open houses"

OPENHOUSE_ID=$(curl -s "$BASE_URL/open-houses" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$OPENHOUSE_ID" ]; then
  test_endpoint "GET" "/open-houses/$OPENHOUSE_ID" "" "Get open house by ID"
fi

# Create new open house
if [ -n "$ACTIVE_PROPERTY_ID" ]; then
  TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d 2>/dev/null)
  NEW_OPENHOUSE=$(curl -s -X POST "$BASE_URL/open-houses" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"propertyId\": \"$ACTIVE_PROPERTY_ID\",
      \"date\": \"$TOMORROW\",
      \"startTime\": \"10:00\",
      \"endTime\": \"14:00\"
    }")

  NEW_OPENHOUSE_ID=$(echo "$NEW_OPENHOUSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  if [ -n "$NEW_OPENHOUSE_ID" ]; then
    log_pass "Create new open house"

    # Register attendee
    test_endpoint "POST" "/open-houses/$NEW_OPENHOUSE_ID/attendees" '{"name":"John Doe","email":"john@example.com","phone":"555-9999"}' "Register attendee"
  else
    log_fail "Create new open house" "$NEW_OPENHOUSE"
  fi
fi

echo ""
echo -e "${YELLOW}[11] CAMPAIGNS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/campaigns" "" "List all campaigns"

CAMPAIGN_ID=$(curl -s "$BASE_URL/campaigns" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$CAMPAIGN_ID" ]; then
  test_endpoint "GET" "/campaigns/$CAMPAIGN_ID" "" "Get campaign by ID"
fi

# Create new campaign
NEW_CAMPAIGN=$(curl -s -X POST "$BASE_URL/campaigns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "type": "EMAIL",
    "status": "DRAFT"
  }')

NEW_CAMPAIGN_ID=$(echo "$NEW_CAMPAIGN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_CAMPAIGN_ID" ]; then
  log_pass "Create new campaign"
  test_endpoint "POST" "/campaigns/$NEW_CAMPAIGN_ID/launch" "" "Launch campaign"
else
  log_fail "Create new campaign" "$NEW_CAMPAIGN"
fi

echo ""
echo -e "${YELLOW}[12] DOCUMENTS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/documents" "" "List all documents"
test_endpoint "GET" "/documents/pending/signatures" "" "Pending signatures"

DOCUMENT_ID=$(curl -s "$BASE_URL/documents" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$DOCUMENT_ID" ]; then
  test_endpoint "GET" "/documents/$DOCUMENT_ID" "" "Get document by ID"
fi

echo ""
echo -e "${YELLOW}[13] COMMISSIONS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/commissions" "" "List all commissions"

COMMISSION_ID=$(curl -s "$BASE_URL/commissions" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$COMMISSION_ID" ]; then
  test_endpoint "GET" "/commissions/$COMMISSION_ID" "" "Get commission by ID"
fi

if [ -n "$AGENT_ID" ]; then
  test_endpoint "GET" "/commissions/agent/$AGENT_ID/summary" "" "Agent commission summary"
fi

echo ""
echo -e "${YELLOW}[14] TAGS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/tags" "" "List all tags"

# Create new tag
NEW_TAG=$(curl -s -X POST "$BASE_URL/tags" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-tag", "color": "#ff0000", "type": "LEAD"}')

NEW_TAG_ID=$(echo "$NEW_TAG" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_TAG_ID" ]; then
  log_pass "Create new tag"
else
  log_fail "Create new tag" "$NEW_TAG"
fi

echo ""
echo -e "${YELLOW}[15] LEAD SOURCES${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/lead-sources" "" "List all lead sources"

# Create new lead source
NEW_SOURCE=$(curl -s -X POST "$BASE_URL/lead-sources" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Source", "type": "REFERRAL"}')

NEW_SOURCE_ID=$(echo "$NEW_SOURCE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_SOURCE_ID" ]; then
  log_pass "Create new lead source"
else
  log_fail "Create new lead source" "$NEW_SOURCE"
fi

echo ""
echo -e "${YELLOW}[16] NOTIFICATIONS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/notifications" "" "List all notifications"
test_endpoint "GET" "/notifications/unread-count" "" "Unread count"

NOTIFICATION_ID=$(curl -s "$BASE_URL/notifications" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NOTIFICATION_ID" ]; then
  test_endpoint "PUT" "/notifications/$NOTIFICATION_ID/read" "" "Mark notification read"
fi

echo ""
echo -e "${YELLOW}[17] INTEGRATIONS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/integrations" "" "List all integrations"
test_endpoint "GET" "/integrations/available" "" "Available integrations"

echo ""
echo -e "${YELLOW}[18] SOCIAL POSTS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/social-posts" "" "List all social posts"

echo ""
echo -e "${YELLOW}[19] FLYERS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/flyers" "" "List all flyers"
test_endpoint "GET" "/flyers/templates/list" "" "Flyer templates"

echo ""
echo -e "${YELLOW}[20] MARKET REPORTS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/market-reports" "" "List all market reports"

echo ""
echo -e "${YELLOW}[21] SAVED SEARCHES${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/saved-searches" "" "List saved searches"

# Create saved search
NEW_SAVED=$(curl -s -X POST "$BASE_URL/saved-searches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Search", "criteria": {"city": "Austin", "minPrice": 300000}}')

NEW_SAVED_ID=$(echo "$NEW_SAVED" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NEW_SAVED_ID" ]; then
  log_pass "Create saved search"
else
  log_fail "Create saved search" "$NEW_SAVED"
fi

echo ""
echo -e "${YELLOW}[22] FAVORITES${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/favorites" "" "List favorites"

if [ -n "$ACTIVE_PROPERTY_ID" ]; then
  test_endpoint "POST" "/favorites/toggle/$ACTIVE_PROPERTY_ID" '{"notes":"Test favorite"}' "Toggle favorite"
fi

echo ""
echo -e "${YELLOW}[23] USERS${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/users" "" "List all users"

USER_ID=$(curl -s "$BASE_URL/users" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$USER_ID" ]; then
  test_endpoint "GET" "/users/$USER_ID" "" "Get user by ID"
fi

echo ""
echo -e "${YELLOW}[24] MESSAGES${NC}"
echo "-------------------------------------------"
test_endpoint "GET" "/messages" "" "List messages"

echo ""
echo -e "${YELLOW}[25] CLEANUP - DELETE TESTS${NC}"
echo "-------------------------------------------"

# Delete created items
if [ -n "$NEW_LEAD_ID" ]; then
  test_endpoint "DELETE" "/leads/$NEW_LEAD_ID" "" "Delete lead"
fi

if [ -n "$NEW_TRANSACTION_ID" ]; then
  test_endpoint "DELETE" "/transactions/$NEW_TRANSACTION_ID" "" "Delete transaction"
fi

if [ -n "$NEW_PROPERTY_ID" ]; then
  test_endpoint "DELETE" "/properties/$NEW_PROPERTY_ID" "" "Delete property"
fi

if [ -n "$NEW_TEAM_ID" ]; then
  test_endpoint "DELETE" "/teams/$NEW_TEAM_ID" "" "Delete team"
fi

if [ -n "$NEW_CAMPAIGN_ID" ]; then
  test_endpoint "DELETE" "/campaigns/$NEW_CAMPAIGN_ID" "" "Delete campaign"
fi

if [ -n "$NEW_TAG_ID" ]; then
  test_endpoint "DELETE" "/tags/$NEW_TAG_ID" "" "Delete tag"
fi

if [ -n "$NEW_SOURCE_ID" ]; then
  test_endpoint "DELETE" "/lead-sources/$NEW_SOURCE_ID" "" "Delete lead source"
fi

if [ -n "$NEW_SAVED_ID" ]; then
  test_endpoint "DELETE" "/saved-searches/$NEW_SAVED_ID" "" "Delete saved search"
fi

echo ""
echo "=========================================="
echo "              TEST RESULTS"
echo "=========================================="
echo -e "${GREEN}PASSED: $PASSED${NC}"
echo -e "${RED}FAILED: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "TOTAL:  $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${RED}SOME TESTS FAILED${NC}"
  exit 1
fi
