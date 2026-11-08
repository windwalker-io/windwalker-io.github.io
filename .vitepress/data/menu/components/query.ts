import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Query',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Selecting Data',
      link: 'select',
    },
    {
      text: 'Conditions',
      link: 'where',
    },
    {
      text: 'Writing Data',
      link: 'writing',
    },
    {
      text: 'Upsert',
      link: 'upsert',
    },
    {
      text: 'Raw SQL and Bindings',
      link: 'expressions',
    },
    {
      text: 'JSON',
      link: 'json',
    },
    {
      text: 'Common Table Expressions',
      link: 'cte',
    },
    {
      text: 'Iteration',
      link: 'iteration',
    },
    {
      text: 'Rendering and Debugging',
      link: 'rendering',
    },
    {
      text: 'Grammars and Escaper',
      link: 'grammars',
    },
  ]
};
