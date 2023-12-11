import {PluginRepo__factory, activeContractsList} from '@aragon/osx-ethers';
import {ContractFactory, ContractTransaction} from 'ethers';
import {
  Interface,
  LogDescription,
  defaultAbiCoder,
  keccak256,
} from 'ethers/lib/utils';
import {existsSync, statSync, readFileSync, writeFileSync} from 'fs';
import {ethers} from 'hardhat';
import {upgrades} from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { VersionTag } from './types';
import { VersionCreatedEvent } from '../typechain/@aragon/osx/framework/plugin/repo/PluginRepo';

export type NetworkNameMapping = {[index: string]: string};

export type ContractList = {[index: string]: {[index: string]: string}};

export type ContractBlockNumberList = {
  // network
  [index: string]: {[index: string]: {address: string; blockNumber: number}};
};

export const osxContracts: ContractList = activeContractsList;

export const networkNameMapping: NetworkNameMapping = {
  mainnet: 'mainnet',
  goerli: 'goerli',
  sepolia: 'sepolia',
  polygon: 'polygon',
  polygonMumbai: 'mumbai',
  base: 'base',
  baseGoerli: 'baseGoerli',
  arbitrum: 'arbitrum',
  arbitrumGoerli: 'arbitrumGoerli',
};

export const ERRORS = {
  ALREADY_INITIALIZED: 'Initializable: contract is already initialized',
};

export function getPluginRepoFactoryAddress(networkName: string) {
  return getContractAddress(networkName, 'PluginRepoFactory');
}

export function getPluginRepoRegistryAddress(networkName: string) {
  return getContractAddress(networkName, 'PluginRepoRegistry');
}

export function getPlaceholderSetupAddress(networkName: string) {
  return getContractAddress(networkName, 'PlaceholderSetup');
}

function getContractAddress(networkName: string, contractName: string) {
  let contractAddr: string;

  if (
    networkName === 'localhost' ||
    networkName === 'hardhat' ||
    networkName === 'coverage'
  ) {
    const hardhatForkNetwork = process.env.NETWORK_NAME
      ? process.env.NETWORK_NAME
      : 'mainnet';

    contractAddr = osxContracts[hardhatForkNetwork][contractName];
    console.log(
      `Using the "${hardhatForkNetwork}" ${contractName} address (${contractAddr}) for deployment testing on network "${networkName}"`
    );
  } else {
    contractAddr = osxContracts[networkNameMapping[networkName]][contractName];

    console.log(
      `Using the ${networkNameMapping[networkName]} ${contractName} address (${contractAddr}) for deployment...`
    );
  }
  return contractAddr;
}

export function getPluginInfo(networkName: string): any {
  let pluginInfoFilePath: string;
  let pluginInfo: any = {};

  if (['localhost', 'hardhat', 'coverage'].includes(networkName)) {
    pluginInfoFilePath = 'plugin-info-testing.json';
  } else {
    pluginInfoFilePath = 'plugin-info.json';
  }

  if (
    existsSync(pluginInfoFilePath) &&
    statSync(pluginInfoFilePath).size !== 0
  ) {
    pluginInfo = JSON.parse(readFileSync(pluginInfoFilePath, 'utf-8'));

    if (!pluginInfo[networkName]) {
      pluginInfo[networkName] = {};
    }
  } else {
    pluginInfo[networkName] = {};
  }
  return pluginInfo;
}

function storePluginInfo(networkName: string, pluginInfo: any) {
  if (['localhost', 'hardhat', 'coverage'].includes(networkName)) {
    writeFileSync(
      'plugin-info-testing.json',
      JSON.stringify(pluginInfo, null, 2) + '\n'
    );
  } else {
    writeFileSync(
      'plugin-info.json',
      JSON.stringify(pluginInfo, null, 2) + '\n'
    );
  }
}

export function addDeployedRepo(
  networkName: string,
  repoName: string,
  contractAddr: string,
  args: [],
  blockNumber: number
) {
  const pluginInfo = getPluginInfo(networkName);

  pluginInfo[networkName]['repo'] = repoName;
  pluginInfo[networkName]['address'] = contractAddr;
  pluginInfo[networkName]['args'] = args;
  pluginInfo[networkName]['blockNumberOfDeployment'] = blockNumber;

  storePluginInfo(networkName, pluginInfo);
}

export function addCreatedVersion(
  networkName: string,
  version: {release: number; build: number},
  metadataURIs: {release: string; build: string},
  blockNumberOfPublication: number,
  setup: {
    name: string;
    address: string;
    args: [];
    blockNumberOfDeployment: number;
  },
  implementation: {
    name: string;
    address: string;
    args: [];
    blockNumberOfDeployment: number;
  },
  helpers:
    | [
        {
          name: string;
          address: string;
          args: [];
          blockNumberOfDeployment: number;
        }
      ]
    | []
) {
  const pluginInfo = getPluginInfo(networkName);

  // Releases can already exist
  if (!pluginInfo[networkName]['releases']) {
    pluginInfo[networkName]['releases'] = {};
  }
  if (!pluginInfo[networkName]['releases'][version.release]) {
    pluginInfo[networkName]['releases'][version.release] = {};
    pluginInfo[networkName]['releases'][version.release]['builds'] = {};
  }

  // Update the releaseMetadataURI
  pluginInfo[networkName]['releases'][version.release]['releaseMetadataURI'] =
    metadataURIs.release;

  pluginInfo[networkName]['releases'][`${version.release}`]['builds'][
    `${version.build}`
  ] = {};

  pluginInfo[networkName]['releases'][`${version.release}`]['builds'][
    `${version.build}`
  ] = {
    setup: setup,
    implementation: implementation,
    helpers: helpers,
    buildMetadataURI: metadataURIs.build,
    blockNumberOfPublication: blockNumberOfPublication,
  };

  storePluginInfo(networkName, pluginInfo);
}

export function toBytes(string: string) {
  return ethers.utils.formatBytes32String(string);
}

export function hashHelpers(helpers: string[]) {
  return keccak256(defaultAbiCoder.encode(['address[]'], [helpers]));
}

export async function findEvent<T>(tx: ContractTransaction, eventName: string) {
  const receipt = await tx.wait();

  const event = (receipt.events || []).find(event => event.event === eventName);

  return event as T | undefined;
}

export async function findEventTopicLog<T>(
  tx: ContractTransaction,
  iface: Interface,
  eventName: string
): Promise<LogDescription & (T | LogDescription)> {
  const receipt = await tx.wait();
  const topic = iface.getEventTopic(eventName);
  const log = receipt.logs.find(x => x.topics[0] === topic);
  if (!log) {
    throw new Error(`No logs found for the topic of event "${eventName}".`);
  }
  return iface.parseLog(log) as LogDescription & (T | LogDescription);
}

type DeployOptions = {
  constructurArgs?: unknown[];
  proxyType?: 'uups';
};

export async function deployWithProxy<T>(
  contractFactory: ContractFactory,
  options: DeployOptions = {}
): Promise<T> {
  upgrades.silenceWarnings(); // Needed because we pass the `unsafeAllow: ["constructor"]` option.

  return upgrades.deployProxy(contractFactory, [], {
    kind: options.proxyType || 'uups',
    initializer: false,
    unsafeAllow: ['constructor'],
    constructorArgs: options.constructurArgs || [],
  }) as unknown as Promise<T>;
}

export function toBytes32(num: number): string {
  const hex = num.toString(16);
  return `0x${'0'.repeat(64 - hex.length)}${hex}`;
}

export type LatestVersion = {
  versionTag: VersionTag;
  pluginSetupContract: string;
  releaseMetadata: string;
  buildMetadata: string;
};

function isSorted(latestVersions: LatestVersion[]): boolean {
  // The list of latest versions has to start with the first release, otherwise something is wrong and we must stop.
  if (latestVersions[0].versionTag[0] != 1) {
    return false;
  }

  for (let i = 0; i < latestVersions.length - 1; i++) {
    if (
      !(
        latestVersions[i + 1].versionTag[0] ==
        latestVersions[i].versionTag[0] + 1
      )
    ) {
      return false;
    }
  }
  return true;
}


export async function populatePluginRepo(
  hre: HardhatRuntimeEnvironment,
  pluginRepoName: string,
  latestVersions: LatestVersion[]
): Promise<void> {
  // make sure that the latestVersions array is sorted by version tag
  if (!isSorted(latestVersions)) {
    throw new Error(`${latestVersions} is not sorted in ascending order`);
  }

  for (const latestVersion of latestVersions) {
    const releaseNumber = latestVersion.versionTag[0];
    const latestBuildNumber = latestVersion.versionTag[1];

    const placeholderSetup = getContractAddress(hre.network.name, 'PlaceholderSetup');

    const emptyMetadata = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(''));

    for (let i = 1; i < latestBuildNumber; i++) {
      await createVersion(
        hre.aragonPluginRepos[pluginRepoName],
        placeholderSetup,
        releaseNumber,
        emptyMetadata,
        ethers.utils.hexlify(
          ethers.utils.toUtf8Bytes(`ipfs://${hre.placeholderBuildCIDPath}`)
        )
      );
    }

    // create latest builds
    await createVersion(
      hre.aragonPluginRepos[pluginRepoName],
      latestVersion.pluginSetupContract,
      releaseNumber,
      latestVersion.releaseMetadata,
      latestVersion.buildMetadata
    );
  }
}

export async function createVersion(
  pluginRepoContract: string,
  pluginSetupContract: string,
  releaseNumber: number,
  releaseMetadata: string,
  buildMetadata: string
): Promise<void> {
  const signers = await ethers.getSigners();

  const PluginRepo = new PluginRepo__factory(signers[0]);
  const pluginRepo = PluginRepo.attach(pluginRepoContract);

  const tx = await pluginRepo.createVersion(
    releaseNumber,
    pluginSetupContract,
    releaseMetadata,
    buildMetadata
  );

  console.log(`Creating build for release ${releaseNumber} with tx ${tx.hash}`);

  await tx.wait();

  const versionCreatedEvent = await findEvent<VersionCreatedEvent>(
    tx,
    'VersionCreated'
  );

  // Check if versionCreatedEvent is not undefined
  if (versionCreatedEvent) {
    console.log(
      `Created build ${versionCreatedEvent.args.build} for release ${
        versionCreatedEvent.args.release
      } with setup address: ${
        versionCreatedEvent.args.pluginSetup
      }, with build metadata ${ethers.utils.toUtf8String(
        buildMetadata
      )} and release metadata ${ethers.utils.toUtf8String(releaseMetadata)}`
    );
  } else {
    // Handle the case where the event is not found
    throw new Error('Failed to get VersionCreatedEvent event log');
  }
}