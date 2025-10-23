const path = require('path');

let mockRestConstructor;
let mockRestPut;
let mockRestSetToken;
let mockRoutesApplicationCommands;

jest.mock('discord.js', () => {
  mockRestPut = jest.fn().mockResolvedValue(undefined);
  mockRestSetToken = jest.fn(function () {
    return this;
  });
  mockRestConstructor = jest.fn().mockImplementation(() => ({
    setToken: mockRestSetToken,
    put: mockRestPut
  }));
  mockRoutesApplicationCommands = jest.fn(() => 'application-route');

  return {
    REST: mockRestConstructor,
    Routes: {
      applicationCommands: mockRoutesApplicationCommands
    }
  };
});

const mockSlashCommandsFixture = [
  {
    data: {
      name: 'foo',
      description: 'sample command',
      toJSON: jest.fn(() => ({ name: 'foo', description: 'sample command' }))
    }
  }
];

const mockTextCommandsFixture = [
  { name: 'bar' }
];

let mockLoadSlashCommands;
let mockLoadTextCommands;

jest.mock('../utils/loadCommands', () => {
  mockLoadSlashCommands = jest.fn(() => mockSlashCommandsFixture);
  mockLoadTextCommands = jest.fn(() => mockTextCommandsFixture);
  return {
    loadSlashCommands: mockLoadSlashCommands,
    loadTextCommands: mockLoadTextCommands
  };
});

describe('textcommands/load', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TOKEN = 'unit-test-token';
    process.env.CLIENT_ID = 'unit-client-id';
    process.env.API_KEYS = 'test-key';
  });

  afterAll(() => {
    delete process.env.TOKEN;
    delete process.env.CLIENT_ID;
    delete process.env.API_KEYS;
  });

  test('reloads slash and text commands when mode=all', async () => {
    jest.resetModules();
    const loadCommand = require('../textcommands/load');

    const replyMock = jest.fn().mockResolvedValue(undefined);
    const commandsMap = new Map();

    const message = {
      author: { id: '1397295237067440309' },
      client: {
        commands: commandsMap,
        user: { id: 'bot-user' }
      },
      reply: replyMock
    };

    await loadCommand.executeText(message, ['all']);

    const commandsDir = path.resolve(__dirname, '..', 'commands');
    const textDir = path.resolve(__dirname, '..', 'textcommands');

    expect(mockLoadSlashCommands).toHaveBeenCalledWith(commandsDir);
    expect(mockLoadTextCommands).toHaveBeenCalledWith(textDir);

    expect(commandsMap.has('foo')).toBe(true);
    expect(commandsMap.has('bar')).toBe(true);
    expect(commandsMap.size).toBe(2);

    expect(mockRestConstructor).toHaveBeenCalledWith({ version: '10' });
    expect(mockRestSetToken).toHaveBeenCalledWith(process.env.TOKEN);
    expect(mockRoutesApplicationCommands).toHaveBeenCalledWith(message.client.user.id);
    expect(mockRestPut).toHaveBeenCalledWith('application-route', {
      body: mockSlashCommandsFixture.map((cmd) => cmd.data.toJSON())
    });

    const successPayload = replyMock.mock.calls[0][0];
    expect(successPayload).toEqual(expect.any(String));
    expect(successPayload).toContain('重新載入');
  });

  test('rejects caller without permission', async () => {
    jest.resetModules();
    const loadCommand = require('../textcommands/load');
    const replyMock = jest.fn().mockResolvedValue(undefined);
    const message = {
      author: { id: 'someone' },
      client: { commands: new Map(), user: { id: 'bot-user' } },
      reply: replyMock
    };

    await loadCommand.executeText(message, ['all']);

    const failurePayload = replyMock.mock.calls[0][0];
    expect(failurePayload).toEqual(expect.any(String));
    expect(failurePayload).toContain('沒有權限');
    expect(mockLoadSlashCommands).not.toHaveBeenCalled();
  });
});
