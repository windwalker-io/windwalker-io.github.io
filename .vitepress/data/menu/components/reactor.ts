import { ComponentMenu } from '../../../types';

export default <ComponentMenu> {
  name: 'Reactor',
  items: [
    {
      text: 'Overview',
      link: '',
    },
    {
      text: 'Servers',
      link: 'servers',
    },
    {
      text: 'HTTP',
      link: 'http',
    },
    {
      text: 'WebSocket',
      link: 'websocket',
    },
    {
    text: 'Sub-servers and Protocols',
    link: 'sub-servers',
    },
  {
    text: 'Coroutine Server',
    link: 'coroutine-server',
  },
  {
    text: 'Memory Tables',
    link: 'memory-tables',
  },
  ]
};
