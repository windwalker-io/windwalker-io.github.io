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
      ]
    },
    {
      text: 'Getting Started',
      items: [
        {
          text: 'Requirements and Installation',
          link: `/${frameworkRoutePrefix}/getting-started/installation`
        },
      ]
    },
  ];
});
