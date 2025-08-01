import fs from "fs";

const productionFilePath = './src/environments/environment.prod.ts';
const productionFileContent = `import { enableProdMode } from '@angular/core';
import { MockEnclosureScenario } from 'app/core/testing/mock-enclosure/enums/mock-enclosure.enum';
import { EnclosureModel } from 'app/enums/enclosure-model.enum';
import { sentryPublicDsn } from 'environments/sentry-public-dns.const';
import { WebUiEnvironment, environmentVersion, remote } from './environment.interface';

export const environment: WebUiEnvironment = {
  environmentVersion,
  remote,
  buildYear: ${new Date().getFullYear()},
  production: true,
  sentryPublicDsn,
  mockConfig: {
    enabled: false,
    controllerModel: EnclosureModel.M40,
    expansionModels: [],
    scenario: MockEnclosureScenario.FillSomeSlots,
  },
  debugPanel: {
    enabled: false,
    defaultMessageLimit: 100,
    mockJobDefaultDelay: 1000,
    persistMockConfigs: true,
  },
};

// Production
enableProdMode();`;

function productionFileErrorHandler(err) {
  if(!err) {
    return;
  }
  console.error(
    'Failed to update production file. WebUI might not work as expected. See following error details.\n',
    err
  );
  exit();
}

fs.writeFile(
  productionFilePath,
  productionFileContent,
  null,
  productionFileErrorHandler
);
