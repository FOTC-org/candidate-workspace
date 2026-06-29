export interface AppConfigModel {
  port: number;
  nodeEnv: string;
  corsAllowedOrigins: string[];
  logLevel: string;
}
