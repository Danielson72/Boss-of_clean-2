# Pull Request

## 📋 Checklist

### Documentation & Specifications
- [ ] **Spec updated** - Feature specifications reflect changes
- [ ] **Plan updated** - Architecture plans align with implementation  
- [ ] **Tasks added** - Development tasks created/updated for changes
- [ ] **OpenAPI/docs updated** - API documentation reflects endpoint changes

### Database & Security
- [ ] **Migrations align with plan** - Database changes match architecture
- [ ] **RLS updated/tested** - Row Level Security policies updated and validated
- [ ] **Schema validation passed** - `scripts/check-rls-and-schema.js` passes

### Deployment & Risk Management
- [ ] **Rollout plan documented** - Deployment strategy and timeline specified
- [ ] **Risks documented** - Potential issues and mitigation strategies identified
- [ ] **Monitoring plan** - Error tracking and performance monitoring addressed

## 📖 Description

### What changed?
<!-- Brief description of the changes made -->

### Why?
<!-- Business context and motivation for the changes -->

### How to test?
<!-- Testing instructions for reviewers -->

## 🏗️ Architecture Impact

### Database Changes
- [ ] No database changes
- [ ] Schema changes (migrations included)
- [ ] New tables/views/functions
- [ ] RLS policy changes

### API Changes  
- [ ] No API changes
- [ ] New endpoints
- [ ] Modified existing endpoints
- [ ] Breaking changes (version bump required)

### Frontend Changes
- [ ] No frontend changes  
- [ ] New components
- [ ] Modified existing components
- [ ] Route changes

## 🚨 Risk Assessment

**Risk Level:** <!-- Low / Medium / High -->

### Potential Issues
<!-- List potential problems and how to mitigate them -->

### Rollback Plan
<!-- How to revert changes if issues occur -->

## 📊 Performance Impact

- [ ] No performance impact expected
- [ ] Database query performance reviewed
- [ ] Frontend bundle size impact assessed
- [ ] Load testing completed (if applicable)

## 🔍 Security Considerations

- [ ] No new security concerns
- [ ] Authentication/authorization changes reviewed
- [ ] Input validation implemented
- [ ] Sensitive data handling reviewed

## 📱 Mobile/Responsive Testing

- [ ] Not applicable
- [ ] Mobile responsive design tested
- [ ] Touch interactions verified
- [ ] Cross-browser compatibility confirmed

---

**Note:** This PR template helps ensure all aspects of changes are considered. Not all sections may apply to every PR.