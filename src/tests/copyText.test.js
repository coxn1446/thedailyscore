import { copyText } from '../utils/copyText';

describe('copyText', () => {
  afterEach(() => {
    delete document.execCommand;
    delete navigator.clipboard;
  });

  test('uses the selection copy when the clipboard API is missing', async () => {
    document.execCommand = jest.fn(() => true);
    await expect(copyText('http://localhost/join/token')).resolves.toBeUndefined();
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  test('falls back to the clipboard API when the selection copy fails', async () => {
    document.execCommand = jest.fn(() => false);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    await copyText('http://localhost/join/token');
    expect(writeText).toHaveBeenCalledWith('http://localhost/join/token');
  });

  test('rejects when neither copy path works', async () => {
    document.execCommand = jest.fn(() => false);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    await expect(copyText('http://localhost/join/token')).rejects.toThrow('denied');
  });
});