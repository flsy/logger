import { curry } from 'fputils';
import { ILogger } from './interfaces';

export const loggerMocked: ILogger = {
  error: curry((traceId: string, functionName: string, message: string, error: Error) => console.log({ level: 'error', traceId, functionName, message, error })),
  warn: curry((traceId: string, functionName: string, message: string) => console.log({ level: 'warn', traceId, functionName, message })),
  debug: curry((traceId: string, functionName: string, message: string) => console.log({ level: 'debug', traceId, functionName, message })),
  info: curry((traceId: string, functionName: string, message: string) => console.log({ level: 'info', traceId, functionName, message })),
  audit: curry((traceId: string, functionName: string, message: string) => console.log({ level: 'audit', traceId, functionName, message })),
};
