import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'HTTP',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Messages',
      link: 'messages',
    },
    {
      text: 'HTTP Client',
      link: 'client',
    },
    {
      text: 'Transports',
      link: 'transports',
    },
    {
      text: 'Output',
      link: 'output',
    },
    {
      text: 'Server',
      link: 'server',
    },
    {
      text: 'Middleware',
      link: 'middleware',
    },
  ]
};
