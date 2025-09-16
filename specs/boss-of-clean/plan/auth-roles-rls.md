# Auth, Roles & RLS Architecture Plan

## Overview
Security architecture implementing Role-Based Access Control (RBAC) with Row Level Security (RLS) policies.

## User Roles

### System Roles
- **anonymous**: Public directory browsing only
- **authenticated**: Base authenticated user
- **customer**: Service requesters (default for new signups)
- **cleaner**: Approved cleaning professionals
- **admin**: Platform administrators
- **super_admin**: Full system access

### Role Assignment
```sql
-- Role stored in users.role column
CREATE TYPE user_role AS ENUM (
  'customer',
  'cleaner', 
  'admin',
  'super_admin'
);

-- Function to check user role
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

## RLS Policies

### Users Table
```sql
-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (auth.user_role() IN ('admin', 'super_admin'));

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);
```

### Cleaners Table
```sql
-- Public can view approved cleaners
CREATE POLICY "Public can view approved cleaners" ON cleaners
  FOR SELECT USING (approval_status = 'approved');

-- Cleaners can manage their own profile
CREATE POLICY "Cleaners can manage own profile" ON cleaners
  FOR ALL USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "Admins can manage all cleaners" ON cleaners
  FOR ALL USING (auth.user_role() IN ('admin', 'super_admin'));
```

### Quote Requests Table
```sql
-- Customers can view their own quotes
CREATE POLICY "Customers view own quotes" ON quote_requests
  FOR SELECT USING (customer_id = auth.uid());

-- Cleaners can view quotes in their service area
CREATE POLICY "Cleaners view area quotes" ON quote_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM cleaners c
      WHERE c.user_id = auth.uid()
      AND c.approval_status = 'approved'
      AND quote_requests.zip_code = ANY(c.service_zip_codes)
    )
  );
```

## Authentication Flow

### Registration
1. Email/password signup → Supabase Auth
2. Create users record with customer role
3. Email verification required
4. Profile completion wizard

### Cleaner Onboarding
1. Customer requests cleaner role
2. Complete business profile
3. Upload verification documents
4. Admin approval → role upgrade to cleaner

### Session Management
- JWT tokens with 1-hour expiry
- Refresh tokens for extended sessions
- MFA optional for cleaners/admins

## Security Considerations

### Data Protection
- Sensitive data encrypted at rest
- PII access logged for audit
- GDPR-compliant data handling
- Regular security audits

### Rate Limiting
- Authentication: 5 attempts per minute
- API calls: 100 per minute for authenticated
- Quote requests: 10 per hour per customer

### Monitoring
- Failed login attempts
- Privilege escalation attempts
- Suspicious access patterns
- RLS policy violations