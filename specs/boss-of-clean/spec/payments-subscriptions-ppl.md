# Payments, Subscriptions & Pay-Per-Lead Specification

## Overview
Multi-tiered revenue model combining freemium directory listings, premium subscriptions for enhanced features, and pay-per-lead marketplace dynamics.

## Revenue Model

### Free Tier
- **Basic Directory Listing**: Appear in public cleaner directory
- **Profile Page**: Standard business profile with basic info
- **Quote Responses**: Respond to customer quote requests
- **5 Leads/Month**: Limited lead volume for testing platform
- **Standard Support**: Email support, help documentation

### Premium Subscriptions

#### Basic ($79/month)
- **Unlimited Leads**: No monthly lead limits
- **Enhanced Profile**: Featured photos, detailed descriptions
- **Priority Placement**: Higher ranking in search results
- **Advanced Analytics**: Lead source tracking, conversion metrics
- **Phone Support**: Priority customer service access

#### Pro ($199/month)
- **Everything in Basic**: All Basic tier features included
- **Instant Booking**: Customers can book directly online
- **Automated Responses**: Template responses to common inquiries  
- **Marketing Tools**: Email campaigns, promotional offers
- **API Access**: Integration with external scheduling/CRM tools
- **White-label Options**: Custom branding on customer communications

### Pay-Per-Lead (PPL)
- **Lead Fees**: $5-15 per qualified customer quote request
- **Dynamic Pricing**: Based on service type, location, urgency
- **Quality Guarantees**: Refunds for invalid/duplicate leads
- **Competitive Bidding**: Multiple cleaners can quote same job
- **Performance Bonuses**: Discounted leads for high-rating cleaners

## Payment Processing

### Stripe Integration
- **Subscription Management**: Automated recurring billing
- **Lead Transactions**: Per-transaction charges for PPL
- **Payment Methods**: Credit cards, ACH, digital wallets
- **International**: Multi-currency support for expansion
- **Compliance**: PCI DSS, SCA, local payment regulations

### Financial Flow
- **Customer Payments**: Held in escrow until service completion
- **Platform Fees**: Deducted before cleaner payout
- **Cleaner Payouts**: Weekly ACH transfers, instant pay options
- **Refund Handling**: Automated for qualifying disputes
- **Tax Reporting**: 1099 generation, sales tax calculation

## Subscription Management

### User Experience
- **Plan Selection**: Clear feature comparison, trial periods
- **Billing Dashboard**: Usage tracking, invoice history
- **Plan Changes**: Upgrade/downgrade with prorated billing
- **Cancellation**: Self-service with retention offers
- **Payment Failures**: Dunning management, grace periods

### Admin Controls
- **Plan Configuration**: Adjust pricing, features, limits
- **Customer Lifecycle**: Track subscription health, churn risk
- **Revenue Analytics**: MRR, cohort analysis, feature adoption
- **A/B Testing**: Price points, feature bundles, trial lengths
- **Customer Success**: Proactive outreach for usage optimization

## Lead Management System

### Lead Qualification
- **Contact Verification**: Phone/email validation
- **Service Match**: Align customer needs with cleaner capabilities
- **Geographic Routing**: Match based on service areas
- **Timing Requirements**: Urgent vs flexible scheduling
- **Budget Alignment**: Match customer budget with cleaner rates

### Lead Distribution
- **Routing Rules**: Primary territory, backup coverage
- **Response Requirements**: Time limits for quote responses
- **Exclusive vs Shared**: Premium leads vs competitive bidding
- **Performance Weighting**: Higher-rated cleaners get priority
- **Capacity Management**: Distribute based on cleaner availability

### Quality Assurance
- **Lead Scoring**: Probability of conversion prediction
- **Duplicate Detection**: Prevent multiple charges for same inquiry
- **Fraud Prevention**: Identify fake or test inquiries
- **Customer Feedback**: Rating system for lead quality
- **Refund Automation**: Automatic refunds for qualifying complaints

## Technical Implementation

### Database Schema
- **Subscriptions Table**: Plan, status, billing cycle, features
- **Transactions Table**: Lead purchases, subscription charges, payouts
- **Usage Tracking**: Lead counts, feature usage, API calls
- **Payment Methods**: Stored payment info, default methods
- **Billing History**: Invoices, payments, refunds, adjustments

### Stripe Webhooks
- **Subscription Events**: Created, updated, canceled, payment failures
- **Payment Events**: Successful charges, failed payments, disputes
- **Customer Events**: Updated payment methods, billing address changes
- **Invoice Events**: Generated, paid, overdue, voided
- **Connect Events**: Cleaner payout status, account verification

### Business Logic
- **Feature Gates**: Subscription-based access controls
- **Usage Limits**: Lead quotas, API rate limits, feature restrictions
- **Pricing Engine**: Dynamic lead pricing based on market factors
- **Billing Logic**: Prorations, credits, refunds, tax calculations
- **Analytics Engine**: Revenue tracking, cohort analysis, churn prediction

## Success Metrics

### Revenue Metrics
- **Monthly Recurring Revenue (MRR)**: Subscription revenue
- **Average Revenue Per User (ARPU)**: Total revenue / active users
- **Customer Lifetime Value (CLV)**: Long-term revenue per customer
- **Lead Revenue**: PPL transaction volume and growth
- **Gross Merchandise Value (GMV)**: Total customer payments processed

### Conversion Metrics
- **Free to Paid**: Percentage of free users upgrading
- **Trial Conversion**: Trial users becoming paid subscribers
- **Plan Upgrades**: Basic to Pro subscription upgrades
- **Lead Conversion**: Quote requests becoming actual jobs
- **Payment Success**: Successful payment completion rates

### Retention Metrics
- **Monthly Churn Rate**: Subscription cancellations
- **Revenue Churn**: Lost MRR from cancellations/downgrades
- **Cohort Retention**: User activity over time
- **Payment Recovery**: Recovered failed payments
- **Feature Adoption**: Usage of premium features

## Risk Management

### Payment Risk
- **Failed Payments**: Dunning campaigns, payment retry logic
- **Chargebacks**: Dispute management, evidence collection
- **Fraud Detection**: Unusual payment patterns, velocity checks
- **Regulatory Compliance**: PCI DSS, GDPR, state money transmission laws
- **Multi-Currency**: Exchange rate fluctuations, local payment preferences

### Business Risk
- **Customer Concentration**: Dependence on large subscription customers
- **Seasonal Patterns**: Revenue fluctuations during slow periods
- **Competition**: Price pressure from other platforms
- **Economic Downturns**: Impact on discretionary spending
- **Technology Dependencies**: Stripe outages, payment processor changes

### Operational Risk
- **Lead Quality**: Maintaining customer satisfaction with PPL leads
- **Subscription Management**: Billing errors, customer service issues
- **Payout Delays**: Cash flow management, reserve requirements
- **Tax Compliance**: Sales tax collection, international tax obligations
- **Data Security**: Protection of payment and financial information