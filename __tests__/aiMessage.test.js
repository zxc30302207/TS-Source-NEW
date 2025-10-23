const path = require('path');
const fs = require('fs');

let mockChatCreate;
let mockOpenAIConstructor;

function getUserMemoryDir() {
  const root = process.env.AI_MEMORY_ROOT || path.join(__dirname, '..', 'memory');
  return path.join(root, 'user');
}

function cleanupUserMemory() {
  const dir = getUserMemoryDir();
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.json')) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
}

describe('AI handleAIMessage', () => {
  beforeEach(() => {
    jest.resetModules();
    mockChatCreate = jest.fn();
    mockOpenAIConstructor = jest.fn(() => ({
      chat: {
        completions: {
          create: mockChatCreate
        }
      }
    }));
    jest.doMock('openai', () => ({ OpenAI: mockOpenAIConstructor }));
    process.env.AI_MEMORY_ROOT = path.join(__dirname, 'tmp-memory');
    fs.mkdirSync(path.join(process.env.AI_MEMORY_ROOT, 'user'), { recursive: true });
    fs.mkdirSync(path.join(process.env.AI_MEMORY_ROOT, 'bot'), { recursive: true });
    cleanupUserMemory();
    process.env.TOKEN = 'unit-test-token';
    process.env.CLIENT_ID = 'unit-client-id';
    process.env.OPENAI_KEY = 'test-openai-key';
  });

  afterEach(() => {
    delete process.env.TOKEN;
    delete process.env.CLIENT_ID;
    delete process.env.OPENAI_KEY;
    const root = process.env.AI_MEMORY_ROOT;
    delete process.env.AI_MEMORY_ROOT;
    if (root && fs.existsSync(root)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('returns text response from OpenAI client', async () => {
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '模擬回覆' } }]
    });

    const ai = require('../ai/system');
    const result = await ai.handleAIMessage('user-1', '你好');

    expect(result).toBe('模擬回覆');
    expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1);
    expect(mockChatCreate).toHaveBeenCalledTimes(1);
    const callArgs = mockChatCreate.mock.calls[0][0];
    const lastMessage = callArgs.messages.slice(-1)[0];
    expect(lastMessage).toEqual({ role: 'user', content: '你好' });
  });

  test('falls back to error message when OpenAI throws', async () => {
    mockChatCreate.mockRejectedValue(new Error('測試錯誤'));

    const ai = require('../ai/system');
    const result = await ai.handleAIMessage('user-2', 'Hi');

    expect(result).toContain('測試錯誤');
  });
});
