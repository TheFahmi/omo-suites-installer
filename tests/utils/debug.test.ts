import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setDebug, setVerbose, isDebug, isVerbose, debugLog, verboseLog } from '../../src/utils/debug.ts';

describe('utils/debug', () => {
  beforeEach(() => {
    setDebug(false);
    setVerbose(false);
    delete process.env.DEBUG;
  });

  describe('setDebug / isDebug', () => {
    it('should default to false', () => {
      expect(isDebug()).toBe(false);
    });

    it('should set debug to true and set env var', () => {
      setDebug(true);
      expect(isDebug()).toBe(true);
      expect(process.env.DEBUG).toBe('1');
    });

    it('should detect DEBUG env var', () => {
      process.env.DEBUG = '1';
      expect(isDebug()).toBe(true);
    });
  });

  describe('setVerbose / isVerbose', () => {
    it('should default to false', () => {
      expect(isVerbose()).toBe(false);
    });

    it('should set verbose to true', () => {
      setVerbose(true);
      expect(isVerbose()).toBe(true);
    });

    it('should return true when debug is enabled (verbose includes debug)', () => {
      setDebug(true);
      expect(isVerbose()).toBe(true);
    });
  });

  describe('debugLog', () => {
    it('should not log when debug is off', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      debugLog('test', 'should not appear');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log when debug is on', () => {
      setDebug(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      debugLog('test-domain', 'hello');
      expect(spy).toHaveBeenCalled();
      // Check the arguments contain the domain (chalk-formatted)
      const callArgs = spy.mock.calls[0].join(' ');
      expect(callArgs).toContain('test-domain');
      spy.mockRestore();
    });
  });

  describe('verboseLog', () => {
    it('should not log when verbose is off', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      verboseLog('test', 'should not appear');
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should log when verbose is on', () => {
      setVerbose(true);
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      verboseLog('domain', 'msg');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
