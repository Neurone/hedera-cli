import * as path from 'path';
import * as dotenv from 'dotenv';

import { recordCommand } from '../state/stateService';
import stateController from '../state/stateController';
import config from '../state/config';
import type { Command } from '../../types';

export default (program: any) => {
  const setup = program.command('setup').description('Setup Hedera CLI');

  setup
    .command('init')
    .hook('preAction', (thisCommand: Command) => {
      const command = [
        thisCommand.parent.action().name(),
        ...thisCommand.parent.args,
      ];
      recordCommand(command);
    })
    .description('Setup the CLI with operator key and ID')
    .action(() => {
      setupCLI('init');
    });

  setup
    .command('reset')
    .hook('preAction', (thisCommand: Command) => {
      const command = [
        thisCommand.parent.action().name(),
        ...thisCommand.parent.args,
      ];
      recordCommand(command);
    })
    .option('-a, --skip-accounts', 'Skip resetting accounts', false)
    .option('-t, --skip-tokens', 'Skip resetting tokens', false)
    .option('-s, --skip-scripts', 'Skip resetting scripts', false)
    .description('Reset the CLI to default settings')
    .action((options: ResetOptions) => {
      reset(options.skipAccounts, options.skipTokens, options.skipScripts);
    });
};

function setupCLI(action: string): void {
  if (process.env.HOME === undefined) {
    console.error('Error: HOME environment variable is not defined');
    return;
  }

  // Path to the .env file in the .hedera directory in the user's home directory
  const envPath = path.join(process.env.HOME, '.hedera/.env');

  // Load environment variables from .env file
  const envConfig = dotenv.config({ path: envPath });

  // Check for errors in loading .env file
  if (envConfig.error) {
    console.error('Error loading .env file:', envConfig.error.message);
    return;
  }

  // Extract operator key and ID from environment variables
  const {
    TESTNET_OPERATOR_KEY,
    TESTNET_OPERATOR_ID,
    MAINNET_OPERATOR_KEY,
    MAINNET_OPERATOR_ID,
  } = process.env;

  let mainnetOperatorId = MAINNET_OPERATOR_ID || '';
  let mainnetOperatorKey = MAINNET_OPERATOR_KEY || '';
  let testnetOperatorId = TESTNET_OPERATOR_ID || '';
  let testnetOperatorKey = TESTNET_OPERATOR_KEY || '';

  // Validate operator key and ID pairs for testnet and mainnet
  if (
    (TESTNET_OPERATOR_KEY && !TESTNET_OPERATOR_ID) ||
    (!TESTNET_OPERATOR_KEY && TESTNET_OPERATOR_ID)
  ) {
    console.error(
      'Both TESTNET_OPERATOR_KEY and TESTNET_OPERATOR_ID must be defined together in the .env file.',
    );
    return;
  }

  if (
    (MAINNET_OPERATOR_KEY && !MAINNET_OPERATOR_ID) ||
    (!MAINNET_OPERATOR_KEY && MAINNET_OPERATOR_ID)
  ) {
    console.error(
      'Both MAINNET_OPERATOR_KEY and MAINNET_OPERATOR_ID must be defined together in the .env file.',
    );
    return;
  }

  // Only write a fresh state file if the user is running the init command
  if (action === 'init') {
    setupState();
  }

  setupOperatorAccounts(
    testnetOperatorId,
    testnetOperatorKey,
    mainnetOperatorId,
    mainnetOperatorKey,
  );
}

function setupOperatorAccounts(
  testnetOperatorId: string,
  testnetOperatorKey: string,
  mainnetOperatorId: string,
  mainnetOperatorKey: string,
): void {
  const state = stateController.getAll();
  let newState = { ...state };
  newState.testnetOperatorKey = testnetOperatorKey;
  newState.testnetOperatorId = testnetOperatorId;
  newState.mainnetOperatorKey = mainnetOperatorKey;
  newState.mainnetOperatorId = mainnetOperatorId;

  if (testnetOperatorKey === '' && testnetOperatorId === '')
    newState.network = 'mainnet';

  stateController.saveState(newState);
}

function setupState(): void {
  const newState = {
    ...config,
  };

  stateController.saveState(newState);
}

function reset(
  skipAccounts: boolean,
  skipTokens: boolean,
  skipScripts: boolean,
): void {
  if (!skipAccounts && !skipTokens && !skipScripts) {
    console.log('Resetting CLI to default settings...');
    setupCLI('init');
    return;
  }

  setupCLI('reset');
  if (!skipAccounts) stateController.saveKey('accounts', {});
  if (!skipTokens) stateController.saveKey('tokens', {});
  if (!skipScripts) stateController.saveKey('scripts', {});
}

interface ResetOptions {
  skipAccounts: boolean;
  skipTokens: boolean;
  skipScripts: boolean;
}
