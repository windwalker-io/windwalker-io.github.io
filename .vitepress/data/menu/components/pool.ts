import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Pool',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Connection Pool',
      link: 'connection-pool',
    },
    {
      text: 'Connections',
      link: 'connections',
    },
    {
      text: 'Health and Lifetime',
      link: 'health-and-lifetime',
    },
    {
      text: 'Swoole Stack',
      link: 'swoole-stack',
    },
  ]
};
