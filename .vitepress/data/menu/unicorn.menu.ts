import { DefaultTheme } from 'vitepress';
import { computed } from 'vue';
import { unicornRoutePrefix } from '../../store/routing-store';

export const unicornSidebar = computed<DefaultTheme.SidebarItem[]>(() => {
  return [
    {
      text: 'Introduction',
      items: [
        {
          text: 'About',
          link: `/${unicornRoutePrefix}/`
        },
        {
          text: 'Installation',
          link: `/${unicornRoutePrefix}/introduction/installation`
        },
        {
          text: 'Getting Started',
          link: `/${unicornRoutePrefix}/introduction/getting-started`
        },
        {
          text: 'Core Concepts',
          link: `/${unicornRoutePrefix}/introduction/core-concepts`
        },
        {
          text: 'Theming',
          link: `/${unicornRoutePrefix}/introduction/theming`
        },
      ],
    },
    {
      text: 'MVC & CRUD',
      items: [
        {
          text: 'MVC Concepts',
          link: `/${unicornRoutePrefix}/mvc-crud/mvc-concepts`
        },
        {
          text: 'Code Generation',
          link: `/${unicornRoutePrefix}/mvc-crud/code-generation`
        },
        {
          text: 'Admin MVC Basics',
          link: `/${unicornRoutePrefix}/mvc-crud/admin-mvc-basics/list-management`,
          collapsed: true,
          items: [
            {
              text: 'List Management',
              link: `/${unicornRoutePrefix}/mvc-crud/admin-mvc-basics/list-management`
            },
            {
              text: 'Edit Management',
              link: `/${unicornRoutePrefix}/mvc-crud/admin-mvc-basics/edit-management`
            },
            {
              text: 'Form Management',
              link: `/${unicornRoutePrefix}/mvc-crud/admin-mvc-basics/form-management`
            },
          ],
        },
        {
          text: 'Simple MVC Basics',
          link: `/${unicornRoutePrefix}/mvc-crud/simple-mvc-basics`
        },
        {
          text: 'CSS & JS in MVC Pages',
          link: `/${unicornRoutePrefix}/mvc-crud/css-js-in-mvc-pages`
        },
        {
          text: 'Nested Set MVC',
          link: `/${unicornRoutePrefix}/mvc-crud/nested-set-mvc`
        },
        {
          text: 'Ordering',
          link: `/${unicornRoutePrefix}/mvc-crud/ordering`
        },
        {
          text: 'Scoped Routing',
          link: `/${unicornRoutePrefix}/mvc-crud/scoped-routing`
        },
      ],
    },
    {
      text: 'Services',
      items: [
        {
          text: 'Storage',
          link: `/${unicornRoutePrefix}/services/storage`
        },
        {
          text: 'Uploader',
          link: `/${unicornRoutePrefix}/services/uploader/upload-service`,
          collapsed: true,
          items: [
            {
              text: 'Upload Service',
              link: `/${unicornRoutePrefix}/services/uploader/upload-service`
            },
            {
              text: 'Image Processing',
              link: `/${unicornRoutePrefix}/services/uploader/image-processing`
            },
          ],
        },
        {
          text: 'Repository',
          link: `/${unicornRoutePrefix}/services/repository`
        },
        {
          text: 'List Selector',
          link: `/${unicornRoutePrefix}/services/list-selector`
        },
        {
          text: 'Components',
          link: `/${unicornRoutePrefix}/services/components`
        },
        {
          text: 'Utilities',
          link: `/${unicornRoutePrefix}/services/utilities/breadcrumbs`,
          collapsed: true,
          items: [
            {
              text: 'Breadcrumbs',
              link: `/${unicornRoutePrefix}/services/utilities/breadcrumbs`
            },
            {
              text: 'StateButton',
              link: `/${unicornRoutePrefix}/services/utilities/state-button`
            },
            {
              text: 'ImagePlaceholder',
              link: `/${unicornRoutePrefix}/services/utilities/image-placeholder`
            },
            {
              text: 'SlugHelper',
              link: `/${unicornRoutePrefix}/services/utilities/slug-helper`
            },
          ],
        },
        {
          text: 'Script Loading',
          link: `/${unicornRoutePrefix}/services/script-loading`
        },
        {
          text: 'Workflow',
          link: `/${unicornRoutePrefix}/services/workflow`
        },
      ],
    },
    {
      text: 'Form Fields',
      items: [
        {
          text: 'Field Generation',
          link: `/${unicornRoutePrefix}/form-fields/field-generation`
        },
        {
          text: 'Form Utilities',
          link: `/${unicornRoutePrefix}/form-fields/form-utilities/form-fields-layout`,
          collapsed: true,
          items: [
            {
              text: 'Form Fields Layout',
              link: `/${unicornRoutePrefix}/form-fields/form-utilities/form-fields-layout`
            },
            {
              text: 'Empty Array Utilities',
              link: `/${unicornRoutePrefix}/form-fields/form-utilities/empty-array-utilities`
            },
            {
              text: 'Conditional Display',
              link: `/${unicornRoutePrefix}/form-fields/form-utilities/conditional-display`
            },
            {
              text: 'Validation & Error Display',
              link: `/${unicornRoutePrefix}/form-fields/form-utilities/validation-error-display`
            },
          ],
        },
        {
          text: 'Field Types',
          link: `/${unicornRoutePrefix}/form-fields/field-types/button-radio`,
          collapsed: true,
          items: [
            {
              text: 'ButtonRadio',
              link: `/${unicornRoutePrefix}/form-fields/field-types/button-radio`
            },
            {
              text: 'Calendar',
              link: `/${unicornRoutePrefix}/form-fields/field-types/calendar`
            },
            {
              text: 'CascadeSelect',
              link: `/${unicornRoutePrefix}/form-fields/field-types/cascade-select`
            },
            {
              text: 'ColorPicker',
              link: `/${unicornRoutePrefix}/form-fields/field-types/color-picker`
            },
            {
              text: 'FileDrag',
              link: `/${unicornRoutePrefix}/form-fields/field-types/file-drag`
            },
            {
              text: 'FlatList',
              link: `/${unicornRoutePrefix}/form-fields/field-types/flat-list`
            },
            {
              text: 'InlineField',
              link: `/${unicornRoutePrefix}/form-fields/field-types/inline-field`
            },
            {
              text: 'LayoutField',
              link: `/${unicornRoutePrefix}/form-fields/field-types/layout-field`
            },
            {
              text: 'ModalField',
              link: `/${unicornRoutePrefix}/form-fields/field-types/modal-field`
            },
            {
              text: 'MultiUploader',
              link: `/${unicornRoutePrefix}/form-fields/field-types/multi-uploader`
            },
            {
              text: 'NuxtEditor',
              link: `/${unicornRoutePrefix}/form-fields/field-types/nuxt-editor`
            },
            {
              text: 'TinymceEditor',
              link: `/${unicornRoutePrefix}/form-fields/field-types/tinymce-editor`
            },
            {
              text: 'Repeatable',
              link: `/${unicornRoutePrefix}/form-fields/field-types/repeatable`
            },
            {
              text: 'SingleImageDrag',
              link: `/${unicornRoutePrefix}/form-fields/field-types/single-image-drag`
            },
            {
              text: 'SqlList',
              link: `/${unicornRoutePrefix}/form-fields/field-types/sql-list`
            },
            {
              text: 'StateList',
              link: `/${unicornRoutePrefix}/form-fields/field-types/state-list`
            },
            {
              text: 'Switcher',
              link: `/${unicornRoutePrefix}/form-fields/field-types/switcher`
            },
          ],
        },
      ],
    },
    {
      text: 'Javascript & Frontend',
      items: [
        {
          text: 'Unicorn JS',
          link: `/${unicornRoutePrefix}/javascript-frontend/unicorn-js`
        },
        {
          text: 'Basics',
          link: `/${unicornRoutePrefix}/javascript-frontend/basics/macros`,
          collapsed: true,
          items: [
            {
              text: 'Macros',
              link: `/${unicornRoutePrefix}/javascript-frontend/basics/macros`
            },
            {
              text: 'Event Bus',
              link: `/${unicornRoutePrefix}/javascript-frontend/basics/event-bus`
            },
            {
              text: 'Mixin',
              link: `/${unicornRoutePrefix}/javascript-frontend/basics/mixin`
            },
            {
              text: 'Data Transfer',
              link: `/${unicornRoutePrefix}/javascript-frontend/basics/data-transfer`
            },
          ],
        },
        {
          text: 'Utilities',
          link: `/${unicornRoutePrefix}/javascript-frontend/utilities/dom-utilities`,
          collapsed: true,
          items: [
            {
              text: 'DOM Utilities',
              link: `/${unicornRoutePrefix}/javascript-frontend/utilities/dom-utilities`
            },
            {
              text: 'Crypto',
              link: `/${unicornRoutePrefix}/javascript-frontend/utilities/crypto`
            },
            {
              text: 'Translation',
              link: `/${unicornRoutePrefix}/javascript-frontend/utilities/translation`
            },
            {
              text: 'Loader',
              link: `/${unicornRoutePrefix}/javascript-frontend/utilities/loader`
            },
            {
              text: 'Router',
              link: `/${unicornRoutePrefix}/javascript-frontend/utilities/router`
            },
            {
              text: 'System URI',
              link: `/${unicornRoutePrefix}/javascript-frontend/utilities/system-uri`
            },
          ],
        },
        {
          text: 'UI',
          link: `/${unicornRoutePrefix}/javascript-frontend/ui/ui-helpers`,
          collapsed: true,
          items: [
            {
              text: 'UI Helpers',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/ui-helpers`
            },
            {
              text: 'Checkbox MultiSelect',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/checkbox-multiselect`
            },
            {
              text: 'Form',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/form`
            },
            {
              text: 'Grid',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/grid`
            },
            {
              text: 'HttpClient',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/http-client`
            },
            {
              text: 'ListDependent',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/list-dependent`
            },
            {
              text: 'SimpleQueue',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/simple-queue`
            },
            {
              text: 'SimpleStack',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/simple-stack`
            },
            {
              text: 'TomeSelect',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/tome-select`
            },
            {
              text: 'WebDirective',
              link: `/${unicornRoutePrefix}/javascript-frontend/ui/web-directive`
            },
          ],
        },
        {
          text: 'Bootstrap 5',
          link: `/${unicornRoutePrefix}/javascript-frontend/bootstrap-5/overview`,
          collapsed: true,
          items: [
            {
              text: 'Overview',
              link: `/${unicornRoutePrefix}/javascript-frontend/bootstrap-5/overview`
            },
            {
              text: 'KeepTab',
              link: `/${unicornRoutePrefix}/javascript-frontend/bootstrap-5/keep-tab`
            },
            {
              text: 'ButtonRadio',
              link: `/${unicornRoutePrefix}/javascript-frontend/bootstrap-5/button-radio`
            },
            {
              text: 'ModalAlert',
              link: `/${unicornRoutePrefix}/javascript-frontend/bootstrap-5/modal-alert`
            },
            {
              text: 'Iframe Modal',
              link: `/${unicornRoutePrefix}/javascript-frontend/bootstrap-5/iframe-modal`
            },
          ],
        },
      ],
    },
  ];
});
