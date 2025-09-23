#!/bin/bash

# =======================================================
# Boss of Clean Database Deployment Script
# Deploys P0 critical fixes to Supabase database
# =======================================================

echo "🚀 Boss of Clean Database Deployment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Option 1: Using Supabase CLI (Recommended)${NC}"
echo "1. Login to Supabase:"
echo "   supabase login"
echo ""
echo "2. Link to your project:"
echo "   supabase link --project-ref jisjxdsrflheosvodoxk"
echo ""
echo "3. Apply RLS security policies:"
echo "   supabase db push"
echo ""
echo "4. Load sample cleaner data:"
echo "   supabase db seed"
echo ""

echo -e "${YELLOW}Option 2: Manual SQL Execution in Supabase Dashboard${NC}"
echo "======================================================"

echo -e "${GREEN}Step 1: Apply RLS Security Policies${NC}"
echo "Copy and paste this SQL in your Supabase SQL Editor:"
echo "👉 File: supabase/migrations/001_fix_missing_rls_policies.sql"
echo ""

echo -e "${GREEN}Step 2: Load Sample Cleaner Data${NC}"
echo "Copy and paste this SQL in your Supabase SQL Editor:"
echo "👉 File: supabase/seed/sample-cleaners.sql"
echo ""

echo -e "${BLUE}Verification Queries:${NC}"
echo "After deployment, run these to verify:"
echo ""
echo "-- Check sample cleaners loaded"
echo "SELECT COUNT(*) FROM public.cleaners WHERE approval_status = 'approved';"
echo "-- Should return: 5"
echo ""
echo "-- Check RLS enabled"
echo "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;"
echo "-- Should show multiple tables with RLS enabled"
echo ""

echo -e "${GREEN}✅ Files Ready for Deployment:${NC}"
echo "- supabase/migrations/001_fix_missing_rls_policies.sql (116 lines)"
echo "- supabase/seed/sample-cleaners.sql (200+ lines)"
echo ""

echo -e "${YELLOW}⚡ Quick Manual Deployment:${NC}"
echo "1. Open: https://jisjxdsrflheosvodoxk.supabase.co/project/default/sql"
echo "2. Run the RLS policies SQL"
echo "3. Run the sample data SQL"
echo "4. Run verification queries"
echo ""

echo -e "${GREEN}🎯 Expected Results After Deployment:${NC}"
echo "- 5 Florida cleaners in search results"
echo "- Secure RLS policies protecting all data"
echo "- Quote request system working for anonymous users"
echo "- Revenue generation capability enabled"
echo ""

echo "Deployment complete! 🚀"