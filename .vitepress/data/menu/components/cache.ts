import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Cache',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'CachePool',
      link: 'cache-pool',
    },
    {
      text: 'Storages',
      link: 'storages',
    },
    {
      text: 'Serializers',
      link: 'serializers',
    },
    {
      text: 'Tagged Caches',
      link: 'tagged-pool',
    },
  ]
};
