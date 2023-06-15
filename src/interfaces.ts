import { Optional } from 'fputils';

export type ILogFinal = (message: string) => void;

export type ILogWithTraceId = {
  (functionName: string): ILogFinal;
  (functionName: string, message: string): void;
};

export type ILog = {
  (traceId: Optional<string>, user: string, data: Optional<object | string>, message: string): void;
  (traceId: Optional<string>, functionName: string, message: string): void;
  (traceId: Optional<string>, functionName: string): ILogFinal;
  (traceId: Optional<string>): ILogWithTraceId;
};

export type ILogErrorFinal = (message: string, error: Error) => void;
export type ILogAuditFinal = (user: string, displayName: string, message: string, data: Optional<object | string>) => void;

export type ILogAudit = {
  (traceId: Optional<string>, user: string, displayName: string, message: string, data: Optional<object | string>): void;
  (traceId: Optional<string>): ILogAuditFinal;
};


export type ILogErrorWithTraceId = {
  (functionName: string, message: string, error: Error): void;
  (functionName: string): ILogErrorFinal;
};

export type ILogError = {
  (traceId: Optional<string>, functionName: string, message: string, error: Error): void;
  (traceId: Optional<string>, functionName: string): ILogErrorFinal;
  (traceId: Optional<string>): ILogErrorWithTraceId;
};

export interface ILogger {
  /**
   * **debug** level - Vhodný pro logování debugovacích informací, které se vetšinou neobjeví v produkčních log souborech
   */
  debug: ILog;
  /**
   * **warn** level - Vhodný pro logování chyb se kterými se za běhu aplikace počítá
   */
  warn: ILog;
  /**
   * **info** level - Vhodný pro logování běžných informativních zpráv o tom, že se něco stalo
   */
  info: ILog;
  /**
   * **error** level - Vhodný pro logování chyb, které by se běžně neměli stávat. Tyto log záznamy by se následně měli řešit jako incident
   */
  error: ILogError;
  /**
   * **audit** level - Vhodný pro logování činností uživatelů. Logy podávají informaci o tom, že uživatel A dělá činnost B a poslal data C.
   */
  audit: ILogAudit;
}

export interface ILoggerWithTraceId {
  debug: ILogWithTraceId;
  warn: ILogWithTraceId;
  info: ILogWithTraceId;
  error: ILogErrorWithTraceId;
  audit: ILogAuditFinal;
  traceId: string;
}

export interface ILoggerWithTraceIdAndFunctionName {
  debug: ILogFinal;
  warn: ILogFinal;
  info: ILogFinal;
  error: ILogErrorFinal;
  traceId: string;
  functionName: string;
}

export interface IConfig {
  /**
   * Název serveru
   */
  hostname: string;
  /**
   * Prostředí, ve kterém loguje aplikace
   */
  environment: string;
  /**
   * Cesta ke složce, kde se ukládají logovací soubory.
   */
  directory?: string;
  /**
   * Název souboru v případě, že se loguje do souboru.
   */
  fileName?: string;
  /**
   * Název služby v daném {@link hostname}
   */
  serviceName: string;
  /**
   * Úroveň logování (defaultně "info")
   */
  level?: string;
  /**
   * Označení verze buildu
   */
  buildVersion?: string;
   /**
   * Adresa syslog serveru
   */
   syslogServer?: string;
   /**
    * Port syslog serveru
    */
   syslogPort?: number;
}
