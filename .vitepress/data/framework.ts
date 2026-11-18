import { DefaultTheme } from 'vitepress';
import { computed } from 'vue';
import { frameworkRoutePrefix } from '../store/routing-store';

export const frameworkSidebar = computed<DefaultTheme.Sidebar>(() => {
  return [
    {
      text: 'Introduction',
      items: [
        {
          text: 'Overview',
          link: `/${frameworkRoutePrefix}/`
        },
        {
          text: 'Features',
          link: `/${frameworkRoutePrefix}/introduction/features`
        },
        {
          text: 'Concepts',
          link: `/${frameworkRoutePrefix}/introduction/concepts`
        },
        {
          text: 'Packages & Components',
          link: `/${frameworkRoutePrefix}/introduction/packages-and-components`
        },
      ]
    },
    {
      text: 'Getting Started',
      items: [
        {
          text: 'Requirements and Installation',
          link: `/${frameworkRoutePrefix}/getting-started/installation`
        },
        {
          text: 'Configuration',
          link: `/${frameworkRoutePrefix}/getting-started/configuration`
        },
        {
          text: 'Directory Structure',
          link: `/${frameworkRoutePrefix}/getting-started/directory-structure`
        },
      ]
    },
    {
      text: 'Core Concepts',
      items: [
        {
          text: 'Applications',
          link: `/${frameworkRoutePrefix}/core-concepts/applications/environment-variables`,
          collapsed: true,
          items: [
            { text: 'Environment Variables', link: `/${frameworkRoutePrefix}/core-concepts/applications/environment-variables` },
            { text: 'Application Layers', link: `/${frameworkRoutePrefix}/core-concepts/applications/layers` },
            { text: 'Request Lifecycle', link: `/${frameworkRoutePrefix}/core-concepts/applications/request-lifecycle` },
          ]
        },
        {
          text: 'Dependency Injection',
          link: `/${frameworkRoutePrefix}/core-concepts/dependency-injection/dependency-injection`,
          collapsed: true,
          items: [
            { text: 'Overview', link: `/${frameworkRoutePrefix}/core-concepts/dependency-injection/dependency-injection` },
            { text: 'Service Variants', link: `/${frameworkRoutePrefix}/core-concepts/dependency-injection/service-variants` },
          ]
        },
        {
          text: 'HTTP & Routing',
          link: `/${frameworkRoutePrefix}/core-concepts/http-routing/http-basics`,
          collapsed: true,
          items: [
            { text: 'HTTP Basics', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/http-basics` },
            { text: 'Routing', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/routing` },
            { text: 'Navigation', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/navigation` },
            { text: 'Middleware', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/middleware` },
            { text: 'Controllers', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/controllers` },
            { text: 'Request & Input', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/request-and-input` },
            { text: 'Validation & Filter', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/validation-and-filter` },
            { text: 'Exceptions', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/exceptions` },
            { text: 'Uploaded Files', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/uploaded-files` },
            { text: 'Responses', link: `/${frameworkRoutePrefix}/core-concepts/http-routing/responses` },
          ]
        },
        {
          text: 'Views',
          link: `/${frameworkRoutePrefix}/core-concepts/views/views`,
          collapsed: true,
          items: [
            { text: 'Layout Rendering', link: `/${frameworkRoutePrefix}/core-concepts/views/renderer` },
            { text: 'Views', link: `/${frameworkRoutePrefix}/core-concepts/views/views` },
            { text: 'Edge Templates', link: `/${frameworkRoutePrefix}/core-concepts/views/edge-templates` },
            { text: 'Asset Management', link: `/${frameworkRoutePrefix}/core-concepts/views/asset-management` },
            { text: 'View Components', link: `/${frameworkRoutePrefix}/core-concepts/views/view-components` },
            { text: 'HTML Frame', link: `/${frameworkRoutePrefix}/core-concepts/views/html-frame` },
          ]
        },
        {
          text: 'State Control',
          link: `/${frameworkRoutePrefix}/core-concepts/state-control/shared-state`,
          collapsed: true,
          items: [
            { text: 'Shared State', link: `/${frameworkRoutePrefix}/core-concepts/state-control/shared-state` },
            { text: 'Session & Cookies', link: `/${frameworkRoutePrefix}/core-concepts/state-control/session-and-cookies` },
          ]
        },
        {
          text: 'Security',
          link: `/${frameworkRoutePrefix}/core-concepts/security/app-secret`,
          collapsed: true,
          items: [
            { text: 'App Secret', link: `/${frameworkRoutePrefix}/core-concepts/security/app-secret` },
            { text: 'Authentication', link: `/${frameworkRoutePrefix}/core-concepts/security/authentication` },
            { text: 'Authorization', link: `/${frameworkRoutePrefix}/core-concepts/security/authorization` },
            { text: 'CSRF Protection', link: `/${frameworkRoutePrefix}/core-concepts/security/csrf-protection` },
            { text: 'Content Security Policy', link: `/${frameworkRoutePrefix}/core-concepts/security/content-security-policy` },
            { text: 'Validation & Filter', link: `/${frameworkRoutePrefix}/core-concepts/security/validation` },
            { text: 'Encryption', link: `/${frameworkRoutePrefix}/core-concepts/security/encryption` },
            { text: 'Hashing', link: `/${frameworkRoutePrefix}/core-concepts/security/hashing` },
          ]
        },
        {
          text: 'API Systems',
          link: `/${frameworkRoutePrefix}/core-concepts/api-systems`,
          collapsed: true,
          items: [
            { text: 'Overview', link: `/${frameworkRoutePrefix}/core-concepts/api-systems` },
            { text: 'JSON API Response', link: `/${frameworkRoutePrefix}/core-concepts/api-systems/json-api` },
            { text: 'Routing & Input', link: `/${frameworkRoutePrefix}/core-concepts/api-systems/routing-and-input` },
            { text: 'Error Codes', link: `/${frameworkRoutePrefix}/core-concepts/api-systems/error-codes` },
            { text: 'CORS', link: `/${frameworkRoutePrefix}/core-concepts/api-systems/cors` },
            { text: 'Object Serialization', link: `/${frameworkRoutePrefix}/core-concepts/api-systems/object-serialization` },
          ]
        },
        { text: 'Events', link: `/${frameworkRoutePrefix}/core-concepts/events` },
        { text: 'Enum', link: `/${frameworkRoutePrefix}/core-concepts/enum` },
        { text: 'Filesystem', link: `/${frameworkRoutePrefix}/core-concepts/filesystem` },
        { text: 'Error Handling', link: `/${frameworkRoutePrefix}/core-concepts/error-handling` },
        { text: 'Logging', link: `/${frameworkRoutePrefix}/core-concepts/logging` },
        { text: 'Helpers', link: `/${frameworkRoutePrefix}/core-concepts/helpers` },
      ]
    },
    {
      text: 'Services',
      items: [
        {
          text: 'Database',
          link: `/${frameworkRoutePrefix}/services/database/getting-started`,
          collapsed: true,
          items: [
            { text: 'Getting Started', link: `/${frameworkRoutePrefix}/services/database/getting-started` },
            { text: 'Entities', link: `/${frameworkRoutePrefix}/services/database/entities` },
            { text: 'Column Types', link: `/${frameworkRoutePrefix}/services/database/column-types` },
            { text: 'ORM', link: `/${frameworkRoutePrefix}/services/database/orm` },
            { text: 'Pagination', link: `/${frameworkRoutePrefix}/services/database/pagination` },
            { text: 'Migrations', link: `/${frameworkRoutePrefix}/services/database/migrations` },
            { text: 'Seeders', link: `/${frameworkRoutePrefix}/services/database/seeders` },
            { text: 'Connection Pool', link: `/${frameworkRoutePrefix}/services/database/connection-pool` },
            { text: 'Backup & Export', link: `/${frameworkRoutePrefix}/services/database/backup-and-export` },
          ]
        },
        { text: 'Cache', link: `/${frameworkRoutePrefix}/services/cache` },
        { text: 'Language', link: `/${frameworkRoutePrefix}/services/language` },
        {
          text: 'DateTime',
          link: `/${frameworkRoutePrefix}/services/datetime`,
          collapsed: true,
          items: [
            { text: 'Overview', link: `/${frameworkRoutePrefix}/services/datetime` },
            { text: 'Chronos', link: `/${frameworkRoutePrefix}/services/datetime/chronos` },
            { text: 'Clock', link: `/${frameworkRoutePrefix}/services/datetime/clock` },
            { text: 'ChronosService', link: `/${frameworkRoutePrefix}/services/datetime/chronos-service` },
            { text: 'Temporal Like API', link: `/${frameworkRoutePrefix}/services/datetime/temporal-like-api` },
          ]
        },
        { text: 'Form', link: `/${frameworkRoutePrefix}/services/form` },
        {
          text: 'Mailer',
          link: `/${frameworkRoutePrefix}/services/mailer`,
          collapsed: true,
          items: [
            { text: 'Mailer', link: `/${frameworkRoutePrefix}/services/mailer` },
            { text: 'MailBuilder', link: `/${frameworkRoutePrefix}/services/mail-builder` },
          ]
        },
        { text: 'Sub-Process', link: `/${frameworkRoutePrefix}/services/sub-process` },
        { text: 'Concurrency', link: `/${frameworkRoutePrefix}/services/concurrency` },
        {
          text: 'Queue',
          link: `/${frameworkRoutePrefix}/services/queue`,
          collapsed: true,
          items: [
            { text: 'Queue Basics', link: `/${frameworkRoutePrefix}/services/queue` },
            { text: 'Flow Control', link: `/${frameworkRoutePrefix}/services/queue/flow-control` },
            { text: 'Enqueuer', link: `/${frameworkRoutePrefix}/services/queue/enqueuer` },
            { text: 'Drivers', link: `/${frameworkRoutePrefix}/services/queue/drivers` },
          ]
        },
        { text: 'Scheduler', link: `/${frameworkRoutePrefix}/services/scheduler` },
        { text: 'Testing', link: `/${frameworkRoutePrefix}/services/testing` },
      ]
    },
    {
      text: 'Frontend Integration',
      items: [
        {
          text: 'Getting Started',
          link: `/${frameworkRoutePrefix}/frontend/overview`,
          collapsed: true,
          items: [
            {
              text: 'Overview',
              link: `/${frameworkRoutePrefix}/frontend/overview`,
            },
            {
              text: 'Setup and Build',
              link: `/${frameworkRoutePrefix}/frontend/setup`,
            },
            {
              text: 'Dev Server and Live Reload',
              link: `/${frameworkRoutePrefix}/frontend/dev-server`,
            },
          ]
        },
        {
          text: 'Development',
          link: `/${frameworkRoutePrefix}/frontend/javascript`,
          collapsed: true,
          items: [
            {
              text: 'JavaScript Development',
              link: `/${frameworkRoutePrefix}/frontend/javascript`,
            },
            {
              text: 'Vue Development',
              link: `/${frameworkRoutePrefix}/frontend/vue`,
            },
            {
              text: 'Blade Macros',
              link: `/${frameworkRoutePrefix}/frontend/blade-macros`,
            },
            {
              text: 'Styles and Assets',
              link: `/${frameworkRoutePrefix}/frontend/styles-and-assets`,
            },
          ]
        },
      ]
    },
    {
      text: 'Packages',
      items: [
        { text: 'Package Installation', link: `/${frameworkRoutePrefix}/packages/package-installation` },
        { text: 'Package Override', link: `/${frameworkRoutePrefix}/packages/package-override` },
        {
          text: 'Package Development',
          link: `/${frameworkRoutePrefix}/packages/package-development`,
          collapsed: true,
          items: [
            { text: 'Overview', link: `/${frameworkRoutePrefix}/packages/package-development` },
            { text: 'Package Migrations', link: `/${frameworkRoutePrefix}/packages/package-migration` },
          ],
        },
      ]
    },
    {
      text: 'Console',
      items: [
        { text: 'Console Basics', link: `/${frameworkRoutePrefix}/console/console-basics` },
        { text: 'Command Development', link: `/${frameworkRoutePrefix}/console/command-development` },
        {
          text: 'Built-in Commands',
          link: `/${frameworkRoutePrefix}/console/basic-commands`,
          collapsed: true,
          items: [
            { text: 'Basic Commands', link: `/${frameworkRoutePrefix}/console/basic-commands` },
            { text: 'Server', link: `/${frameworkRoutePrefix}/console/commands/server` },
            { text: 'Running Code', link: `/${frameworkRoutePrefix}/console/commands/running-code` },
            { text: 'Code Generator', link: `/${frameworkRoutePrefix}/console/commands/code-generator` },
            { text: 'Maintenance', link: `/${frameworkRoutePrefix}/console/commands/maintenance` },
          ],
        },
      ]
    },
    {
      text: 'CLI Servers',
      items: [
        { text: 'Server Basics', link: `/${frameworkRoutePrefix}/cli-servers/server-basics` },
        { text: 'Swoole', link: `/${frameworkRoutePrefix}/cli-servers/swoole` },
      ]
    },
  ];
});
