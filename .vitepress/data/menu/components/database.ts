import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Database',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Connections',
      link: 'connections',
    },
    {
      text: 'Queries',
      link: 'queries',
    },
    {
      text: 'Hydrators',
      link: 'hydrators',
    },
    {
      text: 'Writer',
      link: 'writer',
    },
    {
      text: 'Tables',
      link: 'tables',
    },
    {
      text: 'Databases and Schemas',
      link: 'databases-and-schemas',
    },
    {
      text: 'Schema Diff',
      link: 'schema-diff',
    },
    {
      text: 'Events',
      link: 'events',
    },
  ]
};
