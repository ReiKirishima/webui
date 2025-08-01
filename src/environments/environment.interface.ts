import { MockEnclosureConfig } from 'app/core/testing/mock-enclosure/interfaces/mock-enclosure.interface';

export interface WebUiEnvironment {
  environmentVersion: string;
  remote: string;
  buildYear: number;
  port?: number;
  production: boolean;
  sentryPublicDsn: string;
  mockConfig: MockEnclosureConfig;
  debugPanel?: {
    enabled: boolean;
    defaultMessageLimit: number;
    mockJobDefaultDelay: number;
    persistMockConfigs: boolean;
  };
}

export const environmentVersion = '0.0.3';

export const remote = document.location.host;
