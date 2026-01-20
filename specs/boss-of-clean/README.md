# Boss of Clean - SpecKit Documentation

## Overview

This directory contains the complete specification-as-code infrastructure for the Boss of Clean marketplace platform. It provides a structured approach to feature development, from initial specification through implementation.

## Directory Structure

```
specs/boss-of-clean/
├── spec/           # Feature specifications
├── plan/           # Architecture plans  
├── task/           # Development tasks
├── api/            # OpenAPI reference
└── README.md       # This file
```

## Agent Collaboration Framework

### Startup Coordinator Agent
- **Role**: Session boot + task routing
- **Responsibilities**:
  - Initialize development sessions
  - Route work to appropriate specialist agents
  - Maintain context between agent handoffs
  - Coordinate multi-agent workflows

### PM Agent (Agentic Product Requirements)
- **Role**: Product requirements and planning
- **Writes to**: `/spec`, `/plan`, `/task`
- **Responsibilities**:
  - Feature specification creation
  - Architecture planning
  - Task breakdown and prioritization
  - Requirements validation

### Development Runbook

The recommended development flow follows this pattern:

1. **Research Phase**
   - Understand user needs and business requirements
   - Analyze existing codebase and architecture
   - Review related specifications and plans

2. **Plan Phase** 
   - Create/update feature specifications in `/spec`
   - Design technical architecture in `/plan`
   - Break down work into tasks in `/task`

3. **Task Execution**
   - Implement tasks in priority order
   - Update task status as work progresses
   - Validate against specifications

4. **Review & Integration**
   - Code review against specifications
   - Update documentation as needed
   - Deploy and monitor

## File Types & Purposes

### Specifications (`/spec`)
Business and functional requirements for features:
- **directory-browse-and-search.md** - Public cleaner directory UX
- **cleaner-onboarding-and-approval.md** - Business onboarding flow  
- **payments-subscriptions-ppl.md** - Revenue model and billing

### Architecture Plans (`/plan`)
Technical implementation approaches:
- **directory-architecture.md** - Directory technical design
- **auth-roles-rls.md** - Security and permissions architecture
- **stripe-architecture.md** - Payment processing design

### Development Tasks (`/task`)
Specific implementation work items:
- **task-001-public-directory-view.md** ✅ DONE - Privacy-safe directory view
- **task-002-indexes-and-performance.md** ✅ DONE - Database optimization
- **task-003-cleaner-onboarding-wizard.md** ✅ DONE - Multi-step onboarding
- **task-004-admin-moderation-queue.md** ✅ DONE - Approval workflow
- **task-005-stripe-webhooks.md** ✅ DONE - Payment event handling
- **task-006-seo-sitemap-jsonld.md** ✅ DONE - SEO optimization
- **task-007-quote-request-system.md** ✅ DONE - Quote request lead matching
- **task-008-professional-search-discovery.md** ✅ DONE - Customer search & filtering

### API Reference (`/api`)
- **openapi.yaml** - Complete API specification (reference-only, not wired to runtime yet)

## Task Status Indicators

- ✅ **DONE** - Completed and deployed
- 🔄 **IN PROGRESS** - Currently being worked on
- 📋 **PLANNED** - Designed but not started
- ⏸️ **BLOCKED** - Waiting on dependencies
- ❌ **CANCELLED** - No longer needed

## Usage Guidelines

### For Product Managers
1. Start with `/spec` files to define requirements
2. Work with technical leads on `/plan` files  
3. Break down features into `/task` items
4. Track progress through task status updates

### For Developers
1. Review relevant `/spec` and `/plan` files before coding
2. Update `/task` files with implementation notes
3. Mark tasks as DONE when complete
4. Update API documentation as endpoints are built

### For QA/Testing
1. Use `/spec` files as acceptance criteria
2. Reference `/task` files for specific test scenarios
3. Validate against OpenAPI spec for API testing

## Agent Routing Recommendations

**Route to Startup Coordinator for:**
- Session initialization
- Multi-agent coordination
- Cross-cutting concerns

**Route to PM Agent for:**
- New feature specifications
- Architecture planning
- Task prioritization
- Requirements clarification

**Route to Specialist Agents for:**
- Database migrations (Database Agent)
- Frontend implementation (Frontend Agent)  
- API development (Backend Agent)
- Security reviews (Security Agent)

## Quality Gates

Before marking tasks as DONE:
1. ✅ Implementation matches specification
2. ✅ Tests pass (unit, integration, E2E)
3. ✅ Security review completed
4. ✅ Performance requirements met
5. ✅ Documentation updated

## Integration with CI/CD

The `spec-ci.yml` workflow automatically:
- Validates markdown formatting
- Runs security scans
- Checks API specification syntax
- Validates database schema (non-blocking)
- Generates specification reports

All checks are **non-blocking warnings** to avoid disrupting development flow while providing valuable feedback.

---

*This SpecKit enables structured, agent-driven development while maintaining flexibility and developer productivity.*