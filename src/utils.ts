import { curry, Optional } from 'fputils';
import * as uuid from 'uuid';
import { ILogger, ILoggerWithTraceId, ILoggerWithTraceIdAndFunctionName } from './interfaces';

export const defaultUUID = () => [repeat(8), repeat(4), repeat(4), repeat(4), repeat(12)].join('-');
const repeat = (count: number): string => '0'.repeat(count);
export const toString = (obj: object | string | null | undefined) => (typeof obj === 'string' ? obj : JSON.stringify(obj));
/**
 * Vygeneruje nové traceId
 */
export const generateTraceId: () => string = uuid.v4;

type ApplyTraceId = {
  (traceId: Optional<string>): (logger: ILogger) => ILoggerWithTraceId;
  (traceId: Optional<string>, logger: ILogger): ILoggerWithTraceId;
};

export const applyTraceId: ApplyTraceId = curry(
  (traceId: string | undefined, logger: ILogger): ILoggerWithTraceId => ({
    debug: logger.debug(traceId),
    info: logger.info(traceId),
    warn: logger.warn(traceId),
    error: logger.error(traceId),
    audit: logger.audit(traceId),
    traceId: traceId || defaultUUID(),
  }),
);

type ApplyFunctionName = {
  (functionName: string): (logger: ILoggerWithTraceId) => ILoggerWithTraceIdAndFunctionName;
  (functionName: string, logger: ILoggerWithTraceId): ILoggerWithTraceIdAndFunctionName;
};

export const applyFunctionName: ApplyFunctionName = curry(
  (functionName: string, logger: ILoggerWithTraceId): ILoggerWithTraceIdAndFunctionName => ({
    debug: logger.debug(functionName),
    info: logger.info(functionName),
    warn: logger.warn(functionName),
    error: logger.error(functionName),
    traceId: logger.traceId,
    functionName,
  }),
);

const bool = <T>(a: T) => !!a;

export const appendWhen =
  <R, K>(itemFactory: () => R, condition: K) =>
  <T>(arr: T[]): Array<T | R> | Array<T> => {
    return bool(condition) ? [...arr, itemFactory()] : arr;
  };
