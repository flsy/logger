import dgram from 'dgram';
import { compose } from 'fputils';
import * as fs from 'fs';
import { EOL } from 'os';
import { applyFunctionName, applyTraceId, defaultUUID, generateTraceId, getLogger } from '../index';

const padTo2Digits = (num: number) => num.toString().padStart(2, '0');
const today = (): string => {
  const date = new Date();
  return [date.getFullYear(), padTo2Digits(date.getUTCMonth() + 1), padTo2Digits(date.getUTCDate())].join('-');
};

const tmpFolder = __dirname + '/tmp';
const delay = (n: number = 100) => new Promise((resolve) => setTimeout(resolve, n));
const deleteTmpFolder = () => fs.rmSync(tmpFolder, { force: true, recursive: true });

const directoryExists = () => fs.existsSync(tmpFolder);

const readLog = async (): Promise<string[]> => {
  await delay();
  const content = await fs.readFileSync(`${tmpFolder}/log.${today()}`);
  return content.toString().split('|');
};

describe('logger', () => {
  beforeEach(async () => {
    await deleteTmpFolder();
  });

  const logger = () =>
    getLogger({
      level: 'info',
      serviceName: 'test-app',
      directory: tmpFolder,
      hostname: 'hostname',
      environment: 'test',
    });
  it('logs something', async () => {
    logger().info('trace2', 'fn2', 'mess2');

    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual(['test', 'hostname', '0', 'trace2', 'test-app', 'info', 'fn2', `mess2${EOL}`]);
  });

  it('logs default traceId', async () => {
    logger().info(undefined, 'function-2', 'my message');

    const [_, ...rest] = await readLog();
    expect(rest[3]).toEqual('00000000-0000-0000-0000-000000000000');
  });

  it('should not log debug when log level is info ', async () => {
    logger().debug(undefined, 'function-2', 'my message');

    const log = await readLog();
    expect(log).toEqual(['']);
  });

  it('logs error', async () => {
    logger().error('tr1', 'function-2', 'my message', { message: 'System threw error' } as any);

    const [_, ...rest] = await readLog();
    expect(rest).toEqual(['test', 'hostname', '0', 'tr1', 'test-app', 'error', 'function-2', `my message [System threw error]${EOL}`]);
  });

  it('omits error message when error.message is not defined.', async () => {
    logger().error('tr1', 'function-2', 'my message', { prop: 'No message here' } as any);

    const [_, ...rest] = await readLog();
    expect(rest).toEqual(['test', 'hostname', '0', 'tr1', 'test-app', 'error', 'function-2', `my message []${EOL}`]);
  });

  it('logs composed', async () => {
    compose(applyFunctionName('fn2'), applyTraceId('tr2'))(logger()).info('message 2');
    const [_, ...rest] = await readLog();
    expect(rest).toEqual(['test', 'hostname', '0', 'tr2', 'test-app', 'info', 'fn2', `message 2${EOL}`]);
  });

  it('logs unwanted object', async () => {
    logger().info('tr5', 'function-2', `some object: ${{ id: 15 }}`);

    const [_, ...rest] = await readLog();
    expect(rest[7]).toEqual(`some object: [object Object]${EOL}`);
  });

  it('logs with generated traceId', async () => {
    logger().info(generateTraceId(), 'function-2', `some object: ${{ id: 15 }}`);

    const [_, ...rest] = await readLog();
    expect(rest[1]).toBeTruthy();
    expect(rest[1]).not.toEqual(defaultUUID());
  });

  it('logs audit message successfully with data as object', async () => {
    const testData = { count: 5 };
    logger().audit('traceid', 'user','x', 'logs in', testData);
    const [_, ...loggedMessage] = await readLog();

    expect(loggedMessage).toEqual(['test', 'hostname', '0', 'traceid', 'test-app', 'audit', 'user', 'x', 'logs in', JSON.stringify(testData) + EOL]);
  });

  it('logs audit message successfully with data as string', async () => {
    logger().audit('traceid', 'user', 'John Snow','logs in','data: 5');
    const [_, ...loggedMessage] = await readLog();

    expect(loggedMessage).toEqual(['test', 'hostname', '0', 'traceid', 'test-app', 'audit', 'user', 'John Snow', 'logs in', 'data: 5' + EOL]);
  });

  it('logs audit message successfully with no data provided', async () => {
    logger().audit('traceid', 'user', 'John Snow', 'logs in', undefined);
    const [_, ...loggedMessage] = await readLog();

    expect(loggedMessage).toEqual(['test', 'hostname', '0', 'traceid', 'test-app', 'audit', 'user', 'John Snow', 'logs in' + EOL]);
  });

  it('logs audit when debug level is selected.', async () => {
    const logger = () => getLogger({ hostname: 'hostname', directory: tmpFolder, serviceName: 'test-app', level: 'debug', environment: 'test' });

    logger().audit('trace2', 'user', 'John Snow', 'message', 'mess2');
    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual(['test', 'hostname', '0', 'trace2', 'test-app', 'audit', 'user', 'John Snow', 'message', `mess2${EOL}`]);
  });

  it('logs audit when info level is selected.', async () => {
    const logger = () => getLogger({ hostname: 'hostname', directory: tmpFolder, serviceName: 'test-app', level: 'info', environment: 'test' });

    logger().audit('trace2', 'user', 'John Snow', 'message', 'mess2');
    const [timestamp, ...rest] = await readLog();
    expect(timestamp).toEqual(expect.stringContaining(today()));
    expect(rest).toEqual(['test', 'hostname', '0', 'trace2', 'test-app', 'audit', 'user', 'John Snow', 'message', `mess2${EOL}`]);
  });

  it('does not create file when logging to file is NOT configured.', () => {
    const logger = () => getLogger({ hostname: 'hostname', serviceName: 'test-app', level: 'info', environment: 'test' });
    logger().info('trace', 'fn', 'data', 'message');

    expect(!directoryExists()).toEqual(true);
  });

  it('does create file when logging to file IS configured.', () => {
    const logger = () => getLogger({ hostname: 'hostname', directory: tmpFolder, serviceName: 'test-app', level: 'info', environment: 'test' });
    logger().info('trace', 'fn', 'data', 'message');

    expect(directoryExists()).toEqual(true);
  });

  it('creates file with correct file name.', async () => {
    const logger = () => getLogger({ hostname: 'hostname', directory: tmpFolder, fileName: 'abcdef.log', serviceName: 'test-app', level: 'info', environment: 'test' });
    logger().info('trace', 'fn', 'data', 'message');

    await delay();

    const ls = (folder: string) => fs.readdirSync(folder);
    expect(ls(tmpFolder).findIndex((file) => file.startsWith('abcdef.log'))).toBeGreaterThan(-1);
  });

  it('creates file with default name when filename is not defined.', async () => {
    const logger = () => getLogger({ hostname: 'hostname', directory: tmpFolder, serviceName: 'test-app', level: 'info', environment: 'test' });
    logger().info('trace', 'fn', 'data', 'message');

    await delay();

    const ls = (folder: string) => fs.readdirSync(folder);
    expect(ls(tmpFolder).findIndex((file) => file.startsWith('log.'))).toBeGreaterThan(-1);
  });

  /** This test cannot be used now, because winston syslogger does not close its UDP connection after logger use.*/
  xit('successfully sends logs to syslog when syslog config provided.', async () => {
    const logger = () =>
      getLogger({ hostname: 'hostname', directory: tmpFolder, serviceName: 'test-app', level: 'info', environment: 'test', syslogServer: 'localhost', syslogPort: 10514 });

    let socketHasStarted = false;

    const socket = dgram.createSocket('udp4');

    let syslogMessage = '';
    socket.on('message', (msg) => {
      syslogMessage = msg.toString();
    });
    socket.on('listening', () => {
      socketHasStarted = true;
      logger().audit('trace2', 'user', 'syslog-message', 'message to syslog', {});
    });
    socket.bind(10514);
 
    while (!socketHasStarted) {
      await delay();
    }

    socket.close()    

    const [timestamp, ...rest] = await readLog();
    expect(timestamp.startsWith(today())).toBe(true);
    expect(rest).toEqual(['test', 'hostname', '0', 'trace2', 'test-app', 'audit', 'user', 'syslog-message', 'message to syslog', `{}${EOL}`]);

    const [syslogTimestamp, ...syslogRest] = syslogMessage.split('|');
    expect(syslogRest).toEqual(['test', 'hostname', '0', 'trace2', 'test-app', 'audit', 'user', 'syslog-message', 'message to syslog', `{}`]);
  });
});
