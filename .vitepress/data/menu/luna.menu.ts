import { DefaultTheme } from 'vitepress';
import { computed } from 'vue';
import { lunaRoutePrefix } from '../../store/routing-store';

export const lunaSidebar = computed<DefaultTheme.SidebarItem[]>(() => {
  return [
    {
      text: 'Introduction',
      items: [
        {
          text: 'About',
          link: `/${lunaRoutePrefix}/`
        },
        {
          text: 'Installation',
          link: `/${lunaRoutePrefix}/introduction/installation`
        },
        {
          text: 'Getting Started',
          link: `/${lunaRoutePrefix}/introduction/getting-started`
        },
      ],
    },
    {
      text: 'Content Management',
      items: [
        {
          text: 'Articles',
          link: `/${lunaRoutePrefix}/content-management/articles`
        },
        {
          text: 'Category',
          link: `/${lunaRoutePrefix}/content-management/category`
        },
        {
          text: 'Language',
          link: `/${lunaRoutePrefix}/content-management/language`
        },
        {
          text: 'Menu',
          link: `/${lunaRoutePrefix}/content-management/menu`
        },
        {
          text: 'Page',
          link: `/${lunaRoutePrefix}/content-management/page`
        },
        {
          text: 'Tag',
          link: `/${lunaRoutePrefix}/content-management/tag`
        },
        {
          text: 'Widgets',
          link: `/${lunaRoutePrefix}/content-management/widgets`
        },
      ],
    },
    {
      text: 'Systems',
      items: [
        {
          text: 'User',
          collapsed: true,
          items: [
            {
              text: 'Users',
              link: `/${lunaRoutePrefix}/systems/user/users`
            },
            {
              text: 'Authentication',
              link: `/${lunaRoutePrefix}/systems/user/authentication`
            },
            {
              text: 'Login and Logout',
              link: `/${lunaRoutePrefix}/systems/user/login-and-logout`
            },
            {
              text: 'User Handler',
              link: `/${lunaRoutePrefix}/systems/user/user-handler`
            },
            {
              text: 'Remember Me',
              link: `/${lunaRoutePrefix}/systems/user/remember-me`
            },
            {
              text: 'Social Sign-in',
              link: `/${lunaRoutePrefix}/systems/user/social-sign-in`
            },
          ],
        },
        {
          text: 'ACL',
          collapsed: true,
          items: [
            { text: 'Overview', link: `/${lunaRoutePrefix}/systems/acl/overview` },
            { text: 'Roles and Actions', link: `/${lunaRoutePrefix}/systems/acl/roles-and-actions` },
            { text: 'AccessService', link: `/${lunaRoutePrefix}/systems/acl/access-service` },
            { text: 'Database Roles and Rules', link: `/${lunaRoutePrefix}/systems/acl/database-rules` },
          ],
        },
        {
          text: 'Form Fields',
          collapsed: true,
          items: [
            {
              text: 'Content Selection Fields',
              link: `/${lunaRoutePrefix}/systems/form-fields/content-selection-fields`
            },
            {
              text: 'Localization Fields',
              link: `/${lunaRoutePrefix}/systems/form-fields/localization-fields`
            },
            {
              text: 'Captcha Fields',
              link: `/${lunaRoutePrefix}/systems/form-fields/captcha-fields`
            },
          ],
        },
        {
          text: 'Tree Node',
          link: `/${lunaRoutePrefix}/systems/tree-node`
        },
        {
          text: 'Menu',
          collapsed: true,
          items: [
            {
              text: 'Static Menus',
              link: `/${lunaRoutePrefix}/systems/menu/static-menus`
            },
            {
              text: 'Database Menus',
              link: `/${lunaRoutePrefix}/systems/menu/database-menus`
            },
            {
              text: 'Menu Views',
              link: `/${lunaRoutePrefix}/systems/menu/menu-views`
            },
            {
              text: 'Menu Rendering',
              link: `/${lunaRoutePrefix}/systems/menu/menu-rendering`
            },
          ],
        },
        {
          text: 'Multilingual',
          collapsed: true,
          items: [
            {
              text: 'Enabling Multilingual',
              link: `/${lunaRoutePrefix}/systems/multilingual/enabling-multilingual`
            },
            {
              text: 'Content Translation',
              link: `/${lunaRoutePrefix}/systems/multilingual/content-translation`
            },
                          {
                            text: 'LocaleService',
                            link: `/${lunaRoutePrefix}/systems/multilingual/locale-service`
                          },
                          {
                            text: 'AssociationService',
                            link: `/${lunaRoutePrefix}/systems/multilingual/association-service`
                          },
          ],
        },
      ],
    },
    {
      text: 'Utilities',
      items: [
        {
          text: 'Captcha',
          link: `/${lunaRoutePrefix}/utilities/captcha`
        },
        {
          text: 'Faker',
          link: `/${lunaRoutePrefix}/utilities/faker`
        },
        {
          text: 'Error Pages',
          link: `/${lunaRoutePrefix}/utilities/error-pages`
        },
        {
          text: 'MetaData',
          link: `/${lunaRoutePrefix}/utilities/metadata`
        },
        {
          text: 'Entity Casting',
          link: `/${lunaRoutePrefix}/utilities/entity-casting`
        },
        {
          text: 'Data Importer',
          link: `/${lunaRoutePrefix}/utilities/data-importer`
        },
      ],
    },
  ];
});
