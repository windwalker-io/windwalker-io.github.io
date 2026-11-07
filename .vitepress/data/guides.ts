import { DefaultTheme } from 'vitepress';
import { computed } from 'vue';
import { guideRoutePrefix } from '../store/routing-store';

export const guidesSidebar = computed<DefaultTheme.Sidebar>(() => {
  return [
    {
      text: 'Start',
      items: [
        {
          text: 'Installation',
          link: `/${guideRoutePrefix}/start/`
        },
        {
          text: 'Debugging',
          link: `/${guideRoutePrefix}/start/debugging`
        },
      ]
    },
    {
      text: 'MVC Basic',
      items: [
        {
          text: 'Getting Started',
          link: `/${guideRoutePrefix}/mvc/getting-started`
        },
        {
          text: 'Entity, Migrations and Seeders',
          link: `/${guideRoutePrefix}/mvc/modeling`
        },
        {
          text: 'Create Views',
          link: `/${guideRoutePrefix}/mvc/view`
        },
        {
          text: 'Admin and Forms',
          link: `/${guideRoutePrefix}/mvc/admin`
        },
      ]
    },
    {
      text: 'RAD with Unicorn',
      items: [
        {
          text: 'Overview',
          link: `/${guideRoutePrefix}/rad/`
        },
        {
          text: 'Project Setup',
          link: `/${guideRoutePrefix}/rad/project-setup`
        },
        {
          text: 'Install the Unicorn Package',
          link: `/${guideRoutePrefix}/rad/unicorn-installation`
        },
        {
          text: 'Entities, Migrations and Seeders',
          link: `/${guideRoutePrefix}/rad/modeling`
        },
        {
          text: 'Admin Grid',
          link: `/${guideRoutePrefix}/rad/admin-grid`
        },
        {
          text: 'Advanced Grid Features',
          link: `/${guideRoutePrefix}/rad/advanced-grid`
        },
        {
          text: 'Edit Forms and Saving',
          link: `/${guideRoutePrefix}/rad/edit-forms`
        }
      ]
    }
  ];
});
