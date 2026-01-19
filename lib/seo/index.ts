/**
 * SEO Utilities
 * Export all SEO-related functions and components
 */

// JSON-LD structured data generators
export {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateCleanerSchema,
  generateServiceSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateCleanerListSchema,
  type CleanerProfile,
  type ServiceAreaInfo,
} from './json-ld';

// Metadata generators
export {
  generatePageMetadata,
  generateCleanerMetadata,
  generateServiceMetadata,
  generateLocationMetadata,
  generateCountyMetadata,
  generateSearchMetadata,
  type MetadataOptions,
} from './metadata';
