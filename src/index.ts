import { curry, Optional, pipe } from 'fputils';
import { TransformableInfo } from 'logform';
import { addColors, createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as Transport from 'winston-transport';
import { IConfig, ILogger } from './interfaces';
import { appendWhen, defaultUUID, toString } from './utils';
export * from './interfaces';
export * from './mocks';
export * from './utils';

const auditFormat = (props: TransformableInfo) => {
  const bits = [
    props.timestamp,
    props.environment,
    props.hostname,
    props.buildVersion ?? '0',
    props.traceId || defaultUUID(),
    props.service,
    props.level,
    props.user,
    props.displayName,
    props.message,
  ];
  if (props.data) {
    bits.push(toString(props.data));
  }
  return bits.join('|');
};

const commonFormat = (props: TransformableInfo) => {
  const bits = [
    props.timestamp,
    props.environment,
    props.hostname,
    props.buildVersion ?? '0',
    props.traceId || defaultUUID(),
    props.service,
    props.level,
    props.functionName,
    props.error ? `${props.message} [${props.error.message ?? ''}]` : props.message,
  ];

  return bits.join('|');
};

/**
 * Zkontroluje, že auditní logování je správně rozpoznáno buď jako obyčejný string, nebo jako "barevný string"
 * @param {string} level
 * @return {boolean}
 */
const isAuditLevel = (level: string): boolean => level.includes('audit');

const customFormat = format.printf((props) => (isAuditLevel(props.level) ? auditFormat(props) : commonFormat(props)));

const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    audit: 2,
    info: 3,
    debug: 4,
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    audit: 'blue',
    info: 'green',
    debug: 'grey',
  },
};

/**
 * Vrátí pole transportů pro winston logger
 *
 * @param {IConfig} config
 */
const getTransports = (config: IConfig): Transport[] =>
  pipe(
    [
      new transports.Console({
        level: config.level || 'debug',
        format: format.combine(format.colorize(), format.timestamp(), format.json(), customFormat),
        handleExceptions: true,
      }),
    ] as Transport[],
    appendWhen(
      () =>
        new DailyRotateFile({
          level: config.level || 'info',
          dirname: config.directory,
          filename: `${config.fileName || 'log.%DATE%'}`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxFiles: '30d',
          utc: true,
          handleExceptions: true,
        }),
      config.directory,
    ),
  );

/**
 * Vrátí logger modul
 *
 * @param {IConfig} config
 * @return {ILogger}
 */
export const getLogger = (config: IConfig): ILogger => {
  addColors(customLevels.colors);

  const logger = createLogger({
    levels: customLevels.levels,
    defaultMeta: {
      hostname: config.hostname,
      service: config.serviceName,
      environment: config.environment,
      functionName: '',
      buildVersion: config.buildVersion,
    },
    exitOnError: false,
    format: format.combine(format.timestamp(), format.json(), customFormat),
    transports: getTransports(config),
  });

  logger.on('error', (error) => {
    console.log(`Logger on error: `, error);
  });

  return {
    debug: curry((traceId: Optional<string>, functionName: string, message: string) => logger.log('debug', message, { traceId, functionName })),
    warn: curry((traceId: Optional<string>, functionName: string, message: string) => logger.log('warn', message, { traceId, functionName })),
    info: curry((traceId: Optional<string>, functionName: string, message: string) => logger.log('info', message, { traceId, functionName })),
    error: curry((traceId: Optional<string>, functionName: string, message: string, error: Error) => logger.log('error', message, { traceId, functionName, error })),
    audit: curry((traceId: Optional<string>, user: string, displayName: string, message: string, data: Optional<object | string>) => logger.log('audit', message, { traceId, user, data, displayName })),
  };
};
