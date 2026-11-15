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
        { text: 'Environment Variables', link: `/${frameworkRoutePrefix}/core-concepts/environment-variables` },
        { text: 'Dependency Injection', link: `/${frameworkRoutePrefix}/core-concepts/dependency-injection` },
        { text: 'Request Lifecycle', link: `/${frameworkRoutePrefix}/core-concepts/request-lifecycle` },
      ]
    },
    {
      text: 'HTTP & Routing',
      items: [
        { text: 'HTTP Basics', link: `/${frameworkRoutePrefix}/http-routing/http-basics` },
        { text: 'Routing', link: `/${frameworkRoutePrefix}/http-routing/routing` },
        { text: 'Navigation', link: `/${frameworkRoutePrefix}/http-routing/navigation` },
        { text: 'Middleware', link: `/${frameworkRoutePrefix}/http-routing/middleware` },
        { text: 'Controllers', link: `/${frameworkRoutePrefix}/http-routing/controllers` },
        { text: 'Request & Input', link: `/${frameworkRoutePrefix}/http-routing/request-and-input` },
        { text: 'Responses', link: `/${frameworkRoutePrefix}/http-routing/responses` },
      ]
    },
    {
      text: 'Core Systems',
      items: [
        { text: 'Renderer', link: `/${frameworkRoutePrefix}/core-systems/renderer` },
        { text: 'Views', link: `/${frameworkRoutePrefix}/core-systems/views` },
        { text: 'Edge Templates', link: `/${frameworkRoutePrefix}/core-systems/edge-templates` },
        { text: 'Asset Management', link: `/${frameworkRoutePrefix}/core-systems/asset-management` },
        { text: 'Shared State', link: `/${frameworkRoutePrefix}/core-systems/shared-state` },
        { text: 'Session & Cookies', link: `/${frameworkRoutePrefix}/core-systems/session-and-cookies` },
        { text: 'API Systems', link: `/${frameworkRoutePrefix}/core-systems/api-systems` },
        { text: 'Events', link: `/${frameworkRoutePrefix}/core-systems/events` },
        { text: 'Filesystem', link: `/${frameworkRoutePrefix}/core-systems/filesystem` },
        { text: 'Error Handling', link: `/${frameworkRoutePrefix}/core-systems/error-handling` },
        { text: 'Logging', link: `/${frameworkRoutePrefix}/core-systems/logging` },
        { text: 'Helpers', link: `/${frameworkRoutePrefix}/core-systems/helpers` },
      ]
    },
    {
      text: 'Services',
      items: [
        { text: 'User', link: `/${frameworkRoutePrefix}/services/user` },
        { text: 'Cache', link: `/${frameworkRoutePrefix}/services/cache` },
        { text: 'Language', link: `/${frameworkRoutePrefix}/services/language` },
        { text: 'DateTime', link: `/${frameworkRoutePrefix}/services/datetime` },
        { text: 'View Components', link: `/${frameworkRoutePrefix}/services/view-components` },
        { text: 'Form', link: `/${frameworkRoutePrefix}/services/form` },
        { text: 'Http Client', link: `/${frameworkRoutePrefix}/services/http-client` },
        { text: 'Mailer', link: `/${frameworkRoutePrefix}/services/mailer` },
        { text: 'Sub-Process', link: `/${frameworkRoutePrefix}/services/sub-process` },
        { text: 'Concurrency', link: `/${frameworkRoutePrefix}/services/concurrency` },
        { text: 'Queue', link: `/${frameworkRoutePrefix}/services/queue` },
        { text: 'Scheduler', link: `/${frameworkRoutePrefix}/services/scheduler` },
        { text: 'Testing', link: `/${frameworkRoutePrefix}/services/testing` },
      ]
    },
    {
      text: 'Security',
      items: [
        { text: 'Authentication', link: `/${frameworkRoutePrefix}/security/authentication` },
        { text: 'Authorization', link: `/${frameworkRoutePrefix}/security/authorization` },
        { text: 'CSRF Protection', link: `/${frameworkRoutePrefix}/security/csrf-protection` },
        { text: 'Validation', link: `/${frameworkRoutePrefix}/security/validation` },
        { text: 'Encryption', link: `/${frameworkRoutePrefix}/security/encryption` },
        { text: 'Hashing', link: `/${frameworkRoutePrefix}/security/hashing` },
      ]
    },
    {
      text: 'Database',
      items: [
        { text: 'Getting Started', link: `/${frameworkRoutePrefix}/database/getting-started` },
        { text: 'Entities', link: `/${frameworkRoutePrefix}/database/entities` },
        { text: 'Query Builder', link: `/${frameworkRoutePrefix}/database/query-builder` },
        { text: 'ORM', link: `/${frameworkRoutePrefix}/database/orm` },
        { text: 'Pagination', link: `/${frameworkRoutePrefix}/database/pagination` },
        { text: 'Migrations', link: `/${frameworkRoutePrefix}/database/migrations` },
        { text: 'Seeders', link: `/${frameworkRoutePrefix}/database/seeders` },
        { text: 'Connection Pool', link: `/${frameworkRoutePrefix}/database/connection-pool` },
        { text: 'Backup & Export', link: `/${frameworkRoutePrefix}/database/backup-and-export` },
      ]
    },
    {
      text: 'Packages',
      items: [
        { text: 'Package Installation', link: `/${frameworkRoutePrefix}/packages/package-installation` },
        { text: 'Package Development', link: `/${frameworkRoutePrefix}/packages/package-development` },
      ]
    },
    {
      text: 'Console',
      items: [
        { text: 'Console Basics', link: `/${frameworkRoutePrefix}/console/console-basics` },
        { text: 'Command Development', link: `/${frameworkRoutePrefix}/console/command-development` },
        { text: 'Basic Commands', link: `/${frameworkRoutePrefix}/console/basic-commands` },
        { text: 'REPL & Code Sandbox', link: `/${frameworkRoutePrefix}/console/repl-and-code-sandbox` },
        { text: 'Script Runner', link: `/${frameworkRoutePrefix}/console/script-runner` },
        { text: 'Cache', link: `/${frameworkRoutePrefix}/console/cache` },
        { text: 'Code Generator', link: `/${frameworkRoutePrefix}/console/code-generator` },
        { text: 'Maintenance', link: `/${frameworkRoutePrefix}/console/maintenance` },
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
