#!/bin/bash

# FULL E2E Test - Testing ALL API Endpoints (181 methods)
# Uses Admin: admin@realestate.com / password123

BASE_URL="http://localhost:3001/api"
PASSED=0
FAILED=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASSED++))
}

log_fail() {
  echo -e "${RED}✗${NC} $1 - $2"
  ((FAILED++))
}

test_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "$data" 2>/dev/null)
  fi

  status_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')

  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
    log_pass "$description"
    echo "$body" | head -c 200
    echo ""
  else
    log_fail "$description" "Status: $status_code"
  fi
}

echo "=========================================="
echo "   FULL E2E TEST - ALL 181 API METHODS"
echo "=========================================="

# Wait for server to be ready
echo "Waiting for server..."
for i in 1 2 3 4 5; do
  curl -s http://localhost:3001/api/health > /dev/null && break
  sleep 1
done

# LOGIN
echo -e "\n${YELLOW}=== AUTHENTICATION ===${NC}"
LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@realestate.com","password":"password123"}')
TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
[ -n "$TOKEN" ] && log_pass "Login" || log_fail "Login" "No token"

test_api "GET" "/auth/me" "" "Get current user"
test_api "POST" "/auth/register" '{"email":"test'$RANDOM'@test.com","password":"test123","firstName":"Test","lastName":"User"}' "Register new user"

# USERS
echo -e "\n${YELLOW}=== USERS ===${NC}"
test_api "GET" "/users" "" "Get all users"
USER_ID=$(curl -s "$BASE_URL/users" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_api "GET" "/users/$USER_ID" "" "Get user by ID"
test_api "PUT" "/users/$USER_ID" '{"phone":"555-9999"}' "Update user"

# LEADS
echo -e "\n${YELLOW}=== LEADS ===${NC}"
test_api "GET" "/leads" "" "Get all leads"
test_api "GET" "/leads/stats/overview" "" "Get lead stats"
NEW_LEAD=$(curl -s -X POST "$BASE_URL/leads" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"firstName":"E2E","lastName":"Test","email":"e2e'$RANDOM'@test.com","status":"NEW"}')
LEAD_ID=$(echo "$NEW_LEAD" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$LEAD_ID" ] && log_pass "Create lead" || log_fail "Create lead" "No ID"
test_api "GET" "/leads/$LEAD_ID" "" "Get lead by ID"
test_api "PUT" "/leads/$LEAD_ID" '{"status":"CONTACTED"}' "Update lead"
test_api "GET" "/leads/$LEAD_ID/activities" "" "Get lead activities"
test_api "POST" "/leads/$LEAD_ID/activities" '{"type":"CALL","subject":"Test call","description":"Testing"}' "Add lead activity"
AGENT_ID=$(curl -s "$BASE_URL/agents" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
test_api "PUT" "/leads/$LEAD_ID/assign" "{\"agentId\":\"$AGENT_ID\"}" "Assign lead"
test_api "PUT" "/leads/$LEAD_ID/tags" '{"tags":["hot-lead"]}' "Update lead tags"

# PROPERTIES
echo -e "\n${YELLOW}=== PROPERTIES ===${NC}"
test_api "GET" "/properties" "" "Get all properties"
test_api "GET" "/properties/stats/overview" "" "Get property stats"
NEW_PROP=$(curl -s -X POST "$BASE_URL/properties" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"address":"'$RANDOM' Test St","city":"Austin","state":"TX","zipCode":"78701","propertyType":"SINGLE_FAMILY","listPrice":500000,"bedrooms":3,"bathrooms":2,"squareFeet":2000,"status":"ACTIVE"}')
PROP_ID=$(echo "$NEW_PROP" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$PROP_ID" ] && log_pass "Create property" || log_fail "Create property" "No ID"
test_api "GET" "/properties/$PROP_ID" "" "Get property by ID"
test_api "PUT" "/properties/$PROP_ID" '{"listPrice":525000}' "Update property"
test_api "POST" "/properties/$PROP_ID/photos" '{"photos":[{"url":"https://picsum.photos/800/600","isPrimary":true}]}' "Add property photos"
test_api "POST" "/properties/$PROP_ID/virtual-tours" '{"url":"https://tour.example.com","provider":"matterport"}' "Add virtual tour"

# TRANSACTIONS
echo -e "\n${YELLOW}=== TRANSACTIONS ===${NC}"
test_api "GET" "/transactions" "" "Get all transactions"
test_api "GET" "/transactions/stats/overview" "" "Get transaction stats"
NEW_TXN=$(curl -s -X POST "$BASE_URL/transactions" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"propertyId\":\"$PROP_ID\",\"type\":\"BUYER\",\"listPrice\":500000}")
TXN_ID=$(echo "$NEW_TXN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$TXN_ID" ] && log_pass "Create transaction" || log_fail "Create transaction" "No ID - $NEW_TXN"
test_api "GET" "/transactions/$TXN_ID" "" "Get transaction by ID"
test_api "PUT" "/transactions/$TXN_ID" '{"status":"UNDER_CONTRACT"}' "Update transaction"

# AGENTS
echo -e "\n${YELLOW}=== AGENTS ===${NC}"
test_api "GET" "/agents" "" "Get all agents"
test_api "GET" "/agents/$AGENT_ID" "" "Get agent by ID"
test_api "PUT" "/agents/$AGENT_ID" '{"bio":"Updated bio"}' "Update agent"
test_api "GET" "/agents/$AGENT_ID/performance" "" "Get agent performance"
test_api "POST" "/agents/$AGENT_ID/performance" '{"period":"2024-Q4","listingsSold":5,"totalVolume":2500000}' "Add performance metric"
test_api "GET" "/agents/$AGENT_ID/training" "" "Get agent training"
test_api "POST" "/agents/$AGENT_ID/training" '{"courseName":"Ethics Training","provider":"NAR","status":"IN_PROGRESS"}' "Add training record"
test_api "GET" "/agents/$AGENT_ID/leads" "" "Get agent leads"
test_api "GET" "/agents/$AGENT_ID/properties" "" "Get agent properties"
test_api "GET" "/agents/$AGENT_ID/transactions" "" "Get agent transactions"
test_api "GET" "/agents/$AGENT_ID/stats" "" "Get agent stats"

# TEAMS
echo -e "\n${YELLOW}=== TEAMS ===${NC}"
test_api "GET" "/teams" "" "Get all teams"
NEW_TEAM=$(curl -s -X POST "$BASE_URL/teams" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E Team '$RANDOM'","description":"Test team"}')
TEAM_ID=$(echo "$NEW_TEAM" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$TEAM_ID" ] && log_pass "Create team" || log_fail "Create team" "No ID"
test_api "GET" "/teams/$TEAM_ID" "" "Get team by ID"
test_api "PUT" "/teams/$TEAM_ID" '{"description":"Updated team"}' "Update team"
test_api "GET" "/teams/$TEAM_ID/performance" "" "Get team performance"

# SHOWINGS
echo -e "\n${YELLOW}=== SHOWINGS ===${NC}"
test_api "GET" "/showings" "" "Get all showings"
test_api "GET" "/showings/today/list" "" "Get today's showings"
test_api "GET" "/showings/upcoming/list" "" "Get upcoming showings"
TOMORROW=$(date -v+1d +%Y-%m-%d 2>/dev/null || date -d "+1 day" +%Y-%m-%d)
NEW_SHOWING=$(curl -s -X POST "$BASE_URL/showings" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"propertyId\":\"$PROP_ID\",\"leadId\":\"$LEAD_ID\",\"date\":\"$TOMORROW\",\"time\":\"14:00\",\"duration\":60}")
SHOWING_ID=$(echo "$NEW_SHOWING" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$SHOWING_ID" ] && log_pass "Create showing" || log_fail "Create showing" "$NEW_SHOWING"
test_api "GET" "/showings/$SHOWING_ID" "" "Get showing by ID"
test_api "PUT" "/showings/$SHOWING_ID" '{"notes":"Updated notes"}' "Update showing"
test_api "POST" "/showings/$SHOWING_ID/feedback" '{"rating":5,"comments":"Great property!"}' "Add showing feedback"

# TASKS
echo -e "\n${YELLOW}=== TASKS ===${NC}"
test_api "GET" "/tasks" "" "Get all tasks"
test_api "GET" "/tasks/today/list" "" "Get today's tasks"
test_api "GET" "/tasks/overdue/list" "" "Get overdue tasks"
NEW_TASK=$(curl -s -X POST "$BASE_URL/tasks" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"title\":\"E2E Task\",\"priority\":\"HIGH\",\"dueDate\":\"$TOMORROW\"}")
TASK_ID=$(echo "$NEW_TASK" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$TASK_ID" ] && log_pass "Create task" || log_fail "Create task" "No ID"
test_api "GET" "/tasks/$TASK_ID" "" "Get task by ID"
test_api "PUT" "/tasks/$TASK_ID" '{"priority":"MEDIUM"}' "Update task"
test_api "POST" "/tasks/$TASK_ID/complete" "" "Complete task"

# CAMPAIGNS
echo -e "\n${YELLOW}=== CAMPAIGNS ===${NC}"
test_api "GET" "/campaigns" "" "Get all campaigns"
NEW_CAMPAIGN=$(curl -s -X POST "$BASE_URL/campaigns" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E Campaign '$RANDOM'","type":"EMAIL","status":"DRAFT"}')
CAMPAIGN_ID=$(echo "$NEW_CAMPAIGN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$CAMPAIGN_ID" ] && log_pass "Create campaign" || log_fail "Create campaign" "No ID"
test_api "GET" "/campaigns/$CAMPAIGN_ID" "" "Get campaign by ID"
test_api "PUT" "/campaigns/$CAMPAIGN_ID" '{"name":"Updated Campaign"}' "Update campaign"
test_api "POST" "/campaigns/$CAMPAIGN_ID/drips" '{"subject":"Welcome","content":"Hello!","delayDays":1,"order":1}' "Add drip"
test_api "POST" "/campaigns/$CAMPAIGN_ID/launch" "" "Launch campaign"
test_api "POST" "/campaigns/$CAMPAIGN_ID/pause" "" "Pause campaign"

# OPEN HOUSES
echo -e "\n${YELLOW}=== OPEN HOUSES ===${NC}"
test_api "GET" "/open-houses" "" "Get all open houses"
NEW_OH=$(curl -s -X POST "$BASE_URL/open-houses" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"propertyId\":\"$PROP_ID\",\"date\":\"$TOMORROW\",\"startTime\":\"10:00\",\"endTime\":\"14:00\"}")
OH_ID=$(echo "$NEW_OH" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$OH_ID" ] && log_pass "Create open house" || log_fail "Create open house" "$NEW_OH"
test_api "GET" "/open-houses/$OH_ID" "" "Get open house by ID"
test_api "PUT" "/open-houses/$OH_ID" '{"notes":"Updated notes"}' "Update open house"
test_api "POST" "/open-houses/$OH_ID/attendees" '{"name":"John Doe","email":"john@example.com","phone":"555-1234"}' "Register attendee"
test_api "GET" "/open-houses/property/$PROP_ID" "" "Get property open houses"

# DOCUMENTS
echo -e "\n${YELLOW}=== DOCUMENTS ===${NC}"
test_api "GET" "/documents" "" "Get all documents"
test_api "GET" "/documents/pending/signatures" "" "Get pending signatures"
DOC_ID=$(curl -s "$BASE_URL/documents" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$DOC_ID" ]; then
  test_api "GET" "/documents/$DOC_ID" "" "Get document by ID"
  test_api "PUT" "/documents/$DOC_ID/signature" '{"signatureStatus":"SIGNED"}' "Update signature"
fi

# COMMISSIONS
echo -e "\n${YELLOW}=== COMMISSIONS ===${NC}"
test_api "GET" "/commissions" "" "Get all commissions"
COMM_ID=$(curl -s "$BASE_URL/commissions" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$COMM_ID" ]; then
  test_api "GET" "/commissions/$COMM_ID" "" "Get commission by ID"
fi
test_api "GET" "/commissions/agent/$AGENT_ID/summary" "" "Get agent commission summary"
test_api "POST" "/commissions/calculate" '{"salePrice":500000,"commissionRate":0.03}' "Calculate commission"

# TAGS
echo -e "\n${YELLOW}=== TAGS ===${NC}"
test_api "GET" "/tags" "" "Get all tags"
NEW_TAG=$(curl -s -X POST "$BASE_URL/tags" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"e2e-tag-'$RANDOM'","color":"#ff0000","type":"LEAD"}')
TAG_ID=$(echo "$NEW_TAG" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$TAG_ID" ] && log_pass "Create tag" || log_fail "Create tag" "No ID"
test_api "GET" "/tags/$TAG_ID" "" "Get tag by ID"
test_api "PUT" "/tags/$TAG_ID" '{"color":"#00ff00"}' "Update tag"

# LEAD SOURCES
echo -e "\n${YELLOW}=== LEAD SOURCES ===${NC}"
test_api "GET" "/lead-sources" "" "Get all lead sources"
NEW_SOURCE=$(curl -s -X POST "$BASE_URL/lead-sources" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E Source '$RANDOM'","type":"WEBSITE"}')
SOURCE_ID=$(echo "$NEW_SOURCE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$SOURCE_ID" ] && log_pass "Create lead source" || log_fail "Create lead source" "No ID"
test_api "GET" "/lead-sources/$SOURCE_ID" "" "Get lead source by ID"
test_api "PUT" "/lead-sources/$SOURCE_ID" '{"description":"Updated"}' "Update lead source"
test_api "GET" "/lead-sources/$SOURCE_ID/stats" "" "Get lead source stats"

# SOCIAL POSTS
echo -e "\n${YELLOW}=== SOCIAL POSTS ===${NC}"
test_api "GET" "/social-posts" "" "Get all social posts"
POST_ID=$(curl -s "$BASE_URL/social-posts" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$POST_ID" ]; then
  test_api "GET" "/social-posts/$POST_ID" "" "Get social post by ID"
fi
test_api "POST" "/social-posts/generate" "{\"propertyId\":\"$PROP_ID\",\"platform\":\"INSTAGRAM\"}" "Generate social post"

# FLYERS
echo -e "\n${YELLOW}=== FLYERS ===${NC}"
test_api "GET" "/flyers" "" "Get all flyers"
test_api "GET" "/flyers/templates/list" "" "Get flyer templates"
test_api "POST" "/flyers/generate" "{\"propertyId\":\"$PROP_ID\",\"type\":\"STANDARD\"}" "Generate flyer"

# MARKET REPORTS
echo -e "\n${YELLOW}=== MARKET REPORTS ===${NC}"
test_api "GET" "/market-reports" "" "Get all market reports"
test_api "POST" "/market-reports/generate" '{"area":"Austin, TX","title":"Austin Market Report"}' "Generate market report"

# SAVED SEARCHES
echo -e "\n${YELLOW}=== SAVED SEARCHES ===${NC}"
test_api "GET" "/saved-searches" "" "Get saved searches"
NEW_SEARCH=$(curl -s -X POST "$BASE_URL/saved-searches" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"E2E Search","criteria":{"city":"Austin","minPrice":300000}}')
SEARCH_ID=$(echo "$NEW_SEARCH" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
[ -n "$SEARCH_ID" ] && log_pass "Create saved search" || log_fail "Create saved search" "No ID"
test_api "GET" "/saved-searches/$SEARCH_ID" "" "Get saved search by ID"
test_api "PUT" "/saved-searches/$SEARCH_ID" '{"name":"Updated Search"}' "Update saved search"
test_api "GET" "/saved-searches/$SEARCH_ID/results" "" "Get search results"
test_api "POST" "/saved-searches/$SEARCH_ID/toggle-alert" "" "Toggle search alert"

# FAVORITES
echo -e "\n${YELLOW}=== FAVORITES ===${NC}"
test_api "GET" "/favorites" "" "Get favorites"
test_api "POST" "/favorites" "{\"propertyId\":\"$PROP_ID\",\"notes\":\"E2E test\"}" "Add favorite"
test_api "GET" "/favorites/check/$PROP_ID" "" "Check if favorited"
test_api "POST" "/favorites/toggle/$PROP_ID" '{"notes":"Toggled"}' "Toggle favorite"

# NOTIFICATIONS
echo -e "\n${YELLOW}=== NOTIFICATIONS ===${NC}"
test_api "GET" "/notifications" "" "Get all notifications"
test_api "GET" "/notifications/unread-count" "" "Get unread count"
NOTIF_ID=$(curl -s "$BASE_URL/notifications" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$NOTIF_ID" ]; then
  test_api "PUT" "/notifications/$NOTIF_ID/read" "" "Mark notification read"
fi
test_api "PUT" "/notifications/read-all" "" "Mark all read"

# INTEGRATIONS
echo -e "\n${YELLOW}=== INTEGRATIONS ===${NC}"
test_api "GET" "/integrations" "" "Get all integrations"
test_api "GET" "/integrations/available" "" "Get available integrations"
INT_ID=$(curl -s "$BASE_URL/integrations" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
if [ -n "$INT_ID" ]; then
  test_api "GET" "/integrations/$INT_ID" "" "Get integration by ID"
  test_api "POST" "/integrations/$INT_ID/test" "" "Test integration"
fi

# MESSAGES
echo -e "\n${YELLOW}=== MESSAGES ===${NC}"
test_api "GET" "/messages" "" "Get all messages"

# DASHBOARD
echo -e "\n${YELLOW}=== DASHBOARD ===${NC}"
test_api "GET" "/dashboard/overview" "" "Dashboard overview"
test_api "GET" "/dashboard/activities?limit=10" "" "Dashboard activities"
test_api "GET" "/dashboard/tasks?limit=10" "" "Dashboard tasks"
test_api "GET" "/dashboard/showings?limit=10" "" "Dashboard showings"
test_api "GET" "/dashboard/lead-stats" "" "Dashboard lead stats"
test_api "GET" "/dashboard/performance" "" "Dashboard performance"
test_api "GET" "/dashboard/pipeline" "" "Dashboard pipeline"

# AI ENDPOINTS
echo -e "\n${YELLOW}=== AI FEATURES ===${NC}"
test_api "POST" "/ai/lead-qualifier" "{\"leadId\":\"$LEAD_ID\"}" "AI lead qualifier"
test_api "POST" "/ai/property-matcher" "{\"leadId\":\"$LEAD_ID\",\"limit\":5}" "AI property matcher"
test_api "POST" "/ai/listing-description" "{\"propertyId\":\"$PROP_ID\",\"style\":\"professional\"}" "AI listing description"
test_api "POST" "/ai/market-analysis" '{"area":"Austin, TX","propertyType":"SINGLE_FAMILY"}' "AI market analysis"
test_api "POST" "/ai/follow-up-sequence" "{\"leadId\":\"$LEAD_ID\",\"sequenceType\":\"nurture\"}" "AI follow-up sequence"
test_api "POST" "/ai/price-predictor" '{"address":"123 Main St","city":"Austin","bedrooms":3,"bathrooms":2,"squareFeet":2000}' "AI price predictor"

# CLEANUP
echo -e "\n${YELLOW}=== CLEANUP ===${NC}"
[ -n "$LEAD_ID" ] && test_api "DELETE" "/leads/$LEAD_ID" "" "Delete lead"
[ -n "$TXN_ID" ] && test_api "DELETE" "/transactions/$TXN_ID" "" "Delete transaction"
[ -n "$SHOWING_ID" ] && test_api "DELETE" "/showings/$SHOWING_ID" "" "Delete showing"
[ -n "$TASK_ID" ] && test_api "DELETE" "/tasks/$TASK_ID" "" "Delete task"
[ -n "$CAMPAIGN_ID" ] && test_api "DELETE" "/campaigns/$CAMPAIGN_ID" "" "Delete campaign"
[ -n "$OH_ID" ] && test_api "DELETE" "/open-houses/$OH_ID" "" "Delete open house"
[ -n "$PROP_ID" ] && test_api "DELETE" "/properties/$PROP_ID" "" "Delete property"
[ -n "$TEAM_ID" ] && test_api "DELETE" "/teams/$TEAM_ID" "" "Delete team"
[ -n "$TAG_ID" ] && test_api "DELETE" "/tags/$TAG_ID" "" "Delete tag"
[ -n "$SOURCE_ID" ] && test_api "DELETE" "/lead-sources/$SOURCE_ID" "" "Delete lead source"
[ -n "$SEARCH_ID" ] && test_api "DELETE" "/saved-searches/$SEARCH_ID" "" "Delete saved search"

echo ""
echo "=========================================="
echo "              TEST RESULTS"
echo "=========================================="
echo -e "${GREEN}PASSED: $PASSED${NC}"
echo -e "${RED}FAILED: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "TOTAL:  $TOTAL"

if [ $FAILED -eq 0 ]; then
  echo -e "\n${GREEN}ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "\n${RED}SOME TESTS FAILED${NC}"
  exit 1
fi
