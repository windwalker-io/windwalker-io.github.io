import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Queue',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Writing Jobs',
      link: 'writing-jobs',
    },
    {
      text: 'Drivers',
      link: 'drivers',
    },
    {
      text: 'Workers',
      link: 'workers',
    },
    {
      text: 'Enqueuer',
      link: 'enqueuer',
    },
    {
      text: 'Failed Jobs',
      link: 'failed-jobs',
    },
  ]
};
