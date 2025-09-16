# Cleaner Onboarding and Approval Specification

## Overview
Streamlined onboarding flow for cleaning professionals to join the Boss of Clean marketplace, with automated verification and manual approval processes.

## User Stories

### Cleaning Professionals
- **Discovery**: Learn about Boss of Clean through marketing channels
- **Registration**: Create account with email/phone verification  
- **Business Setup**: Complete comprehensive business profile
- **Document Upload**: Submit verification documents (insurance, licenses)
- **Approval Wait**: Receive status updates during review process
- **Directory Listing**: Go live in public directory upon approval

### Platform Administrators
- **Review Queue**: Process pending cleaner applications
- **Document Verification**: Validate submitted credentials
- **Background Checks**: Initiate and review third-party checks
- **Approval Decision**: Approve, reject, or request additional info
- **Communication**: Send status updates and feedback to applicants

## Onboarding Flow

### Step 1: Account Creation
- **Email Registration**: Standard email/password signup
- **Phone Verification**: SMS confirmation for account security
- **Role Selection**: Confirm "cleaner" role vs customer
- **Terms Acceptance**: Platform terms, service agreement

### Step 2: Business Information
- **Business Name**: Legal entity name and DBA
- **Contact Details**: Business phone, email, website
- **Service Area**: ZIP codes, cities served
- **Service Types**: Residential, commercial, specialties
- **Team Size**: Solo operator vs team, employee count
- **Experience**: Years in business, previous platforms

### Step 3: Location & Logistics  
- **Primary Location**: Business headquarters address
- **Service Radius**: Miles willing to travel
- **Transportation**: Vehicle capacity, equipment storage
- **Scheduling**: Available days/hours, advance booking requirements
- **Pricing Model**: Hourly rates, flat fees, custom quotes

### Step 4: Verification Documents
- **Business License**: State/local business registration
- **Insurance Certificate**: General liability, bonding
- **Background Check**: Criminal history check consent
- **References**: Previous client or employer references
- **Photos**: Professional headshots, team photos, equipment

### Step 5: Platform Training
- **How It Works**: Platform mechanics, lead generation
- **Profile Optimization**: Tips for attractive profiles
- **Quote Management**: Responding to customer requests
- **Payment Processing**: Stripe setup, fee structure
- **Support Resources**: Help docs, contact information

## Approval Process

### Automated Verification
- **Document Analysis**: OCR extraction of key document data
- **Insurance Validation**: API checks with insurance providers
- **License Verification**: Cross-reference with state databases
- **Background Check**: Integration with screening services
- **Email/Phone**: Automated verification challenges

### Manual Review
- **Profile Completeness**: All required fields populated
- **Photo Quality**: Professional, clear, appropriate images
- **Service Description**: Clear, grammatically correct, helpful
- **Pricing Reasonableness**: Within market range for area
- **Reference Checks**: Contact provided references

### Decision Matrix
- **Auto-Approve**: All verifications pass, complete profile, good references
- **Auto-Reject**: Failed background check, invalid documents, fake information
- **Manual Review**: Edge cases requiring human judgment
- **Request Info**: Missing documents, unclear information

## Platform Integration

### Database Changes
- **Approval Status**: Enum (pending, approved, rejected, suspended)
- **Verification Fields**: Document upload URLs, check results
- **Review Notes**: Admin feedback, rejection reasons
- **Approval Timeline**: Submitted, reviewed, decision dates

### User Experience
- **Progress Indicator**: Step completion, estimated approval time  
- **Status Dashboard**: Real-time application status
- **Document Manager**: Upload, replace, track verification status
- **Communication Center**: Messages from admin team
- **Onboarding Help**: Live chat, FAQ, video tutorials

### Admin Interface
- **Review Queue**: Prioritized list of pending applications
- **Cleaner Profiles**: Comprehensive view of application data
- **Batch Actions**: Approve/reject multiple applications
- **Verification Tools**: Quick access to validation services
- **Communication Tools**: Template messages, status updates

## Business Logic

### Quality Standards
- **Minimum Experience**: 1+ years professional cleaning
- **Insurance Requirements**: $1M general liability minimum
- **Background Standards**: No violent crimes, recent drug offenses
- **Service Areas**: Must serve at least 3 ZIP codes
- **Response Time**: Commit to 24-hour quote response SLA

### Geographic Expansion
- **Market Prioritization**: Focus on high-demand areas first
- **Capacity Management**: Limit approvals per ZIP code
- **Competition Balance**: Ensure customer choice, prevent oversaturation
- **Quality Maintenance**: Higher standards in saturated markets

## Success Metrics

### Conversion Funnel
- **Registration Rate**: Visitors → signups
- **Completion Rate**: Signups → submitted applications
- **Approval Rate**: Applications → approved cleaners
- **Activation Rate**: Approved → first customer quote
- **Retention Rate**: Active cleaners after 3/6/12 months

### Quality Metrics
- **Customer Satisfaction**: Average rating of new cleaners
- **Complaint Rate**: Issues with recently approved cleaners
- **Verification Accuracy**: False positives/negatives in automation
- **Time to Approval**: Days from submission to decision
- **Support Ticket Volume**: Help requests during onboarding

## Risk Management

### Fraud Prevention
- **Document Verification**: OCR + manual review prevents fake documents
- **Reference Checks**: Verify work history and client satisfaction
- **Duplicate Detection**: Prevent multiple accounts per person/business
- **Gradual Access**: Limited features until full verification
- **Monitoring**: Track behavior patterns for suspicious activity

### Legal Compliance
- **Independent Contractors**: Clear 1099 relationship, not employees
- **Background Checks**: FCRA compliance, proper disclosures
- **Data Privacy**: Secure handling of sensitive documents
- **Non-Discrimination**: Fair approval process regardless of protected classes
- **Insurance Requirements**: Adequate coverage for platform protection