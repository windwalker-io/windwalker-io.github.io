import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Filesystem',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'File Object',
      link: 'file-object',
    },
    {
      text: 'Iterating Files',
      link: 'iterating-files',
    },
    {
      text: 'Path Collection',
      link: 'path-collection',
    },
    {
      text: 'Path Utilities',
      link: 'path-utilities',
    },
    {
      text: 'Temporary Files',
      link: 'temp-files',
    },
    {
      text: 'Async Operations',
      link: 'async-operations',
    },
  ]
};
