import { Client, AccountId, PrivateKey } from '@hashgraph/sdk';

import stateController from './stateController';

import type { Account, Token } from '../../types';

/** hook (middleware)
 * @example command ['account', 'create', '-b', '1000', '-t', 'ed25519']
 */
function recordCommand(command: string[]): void {
  const state = stateController.getAll();
  if (state.recording === 1) {
    state.scripts[state.recordingScriptName].commands.push(command.join(' '));

    stateController.saveState(state);
  }
}

function getMirrorNodeURL(): string {
  const network = stateController.get('network');
  const mirrorNodeURL =
    network === 'testnet'
      ? stateController.get('mirrorNodeTestnet')
      : stateController.get('mirrorNodeMainnet');
  return mirrorNodeURL;
}

function getHederaClient(): Client {
  const state = stateController.getAll();
  let client: Client;
  let operatorId, operatorKey;

  switch (state.network) {
    case 'mainnet':
      client = Client.forMainnet();
      operatorId = state.mainnetOperatorId;
      operatorKey = state.mainnetOperatorKey;
      break;
    case 'testnet':
      client = Client.forTestnet();
      operatorId = state.testnetOperatorId;
      operatorKey = state.testnetOperatorKey;
      break;
    default:
      throw new Error(`Unsupported network: ${state.network}`);
  }

  if (operatorId === '' || operatorKey === '') {
    throw new Error(`operator key and ID not set for ${state.network}`);
  }

  return client.setOperator(
    AccountId.fromString(operatorId),
    PrivateKey.fromString(operatorKey),
  );
}

function switchNetwork(name: string) {
  if (!['mainnet', 'testnet'].includes(name)) {
    console.error('Invalid network name. Available networks: mainnet, testnet');
    return;
  }

  const state = stateController.getAll();
  let operatorId, operatorKey;
  switch (state.network) {
    case 'mainnet':
      operatorId = state.mainnetOperatorId;
      operatorKey = state.mainnetOperatorKey;
      break;
    case 'testnet':
      operatorId = state.testnetOperatorId;
      operatorKey = state.testnetOperatorKey;
      break;
  }

  if (operatorId === '' || operatorKey === '') {
    throw new Error(`operator key and ID not set for ${state.network}`);
  }

  stateController.saveKey('network', name);
}

function addTokenAssociation(
  tokenId: string,
  accountId: string,
  alias: string,
) {
  const tokens = stateController.get('tokens');
  const token: Token = tokens[tokenId];
  token.associations.push({ alias, accountId });
  tokens[tokenId] = token;
  stateController.saveKey('tokens', tokens);
}

/* Accounts */
function getAccountById(accountId: string): Account | undefined {
  const accounts: Record<string, Account> = stateController.get('accounts');
  const account = Object.values(accounts).find(
    (account: Account) => account.accountId === accountId,
  );
  return account;
}

function getAccountByAlias(alias: string): Account | undefined {
  const accounts: Record<string, Account> = stateController.get('accounts');
  return accounts[alias];
}

function getAccountByIdOrAlias(accountIdOrAlias: string): Account {
  const accountIdPattern = /^0\.0\.\d+$/;
  const match = accountIdOrAlias.match(accountIdPattern);
  let account;
  if (match) {
    account = getAccountById(accountIdOrAlias);
  } else {
    account = getAccountByAlias(accountIdOrAlias);
  }

  if (!account) {
    throw new Error(`Account not found: ${accountIdOrAlias}`);
  }

  return account;
}

export {
  getMirrorNodeURL,
  getHederaClient,
  recordCommand,
  switchNetwork,
  addTokenAssociation,
  getAccountById,
  getAccountByAlias,
  getAccountByIdOrAlias,
};
