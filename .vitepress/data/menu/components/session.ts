import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Session',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Bridges',
      link: 'bridges',
    },
    {
      text: 'Storage Handlers',
      link: 'handlers',
    },
    {
      text: 'Cookies',
      link: 'cookies',
    },
    {
      text: 'Flash Messages',
      link: 'flash-messages',
    },
    {
      text: 'Security',
      link: 'security',
    },
  ]
};
