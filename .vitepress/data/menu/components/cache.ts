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
      text: 'TaggedCachePool',
      link: 'tagged-pool',
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
      text: 'CacheLock',
      link: 'cache-lock',
    },
  ]
};
