import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Test',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Assertions',
      link: 'assertions',
    },
    {
      text: 'Database Tests',
      link: 'database',
    },
    {
      text: 'Accessing Members',
      link: 'accessors',
    },
    {
      text: 'Swoole Tests',
      link: 'swoole',
    },
  ]
};
