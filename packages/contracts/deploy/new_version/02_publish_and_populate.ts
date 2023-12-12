import {
  METADATA,
  PLUGIN_CONTRACT_NAME,
  PLUGIN_REPO_ENS_NAME,
  PLUGIN_SETUP_CONTRACT_NAME,
  VERSION,
} from '../../plugin-settings';
import {
  addCreatedVersion,
  getPluginInfo,
  populatePluginRepo,
} from '../../utils/helpers';
import {uploadToIPFS} from '../../utils/ipfs';
import {PluginRepo__factory, PluginSetup__factory} from '@aragon/osx-ethers';
import {ethers} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log(
    `Publishing ${PLUGIN_SETUP_CONTRACT_NAME} as v${VERSION.release}.${VERSION.build} in the "${PLUGIN_REPO_ENS_NAME}" plugin repo`
  );

  const {deployments, network} = hre;
  const [deployer] = await hre.ethers.getSigners();

  // Upload the metadata to IPFS
  const releaseMetadataURI = `ipfs://${await uploadToIPFS(
    JSON.stringify(METADATA.release)
  )}`;
  const buildMetadataURI = `ipfs://${await uploadToIPFS(
    JSON.stringify(METADATA.build)
  )}`;

  console.log(`Uploaded release metadata: ${releaseMetadataURI}`);
  console.log(`Uploaded build metadata: ${buildMetadataURI}`);

  // Get PluginSetup
  const setup = await deployments.get(PLUGIN_SETUP_CONTRACT_NAME);

  // Get PluginRepo
  const pluginRepo = PluginRepo__factory.connect(
    getPluginInfo(network.name)[network.name]['address'],
    deployer
  );

  //create version and populate the previous with placeholder
  let tx = await populatePluginRepo(hre, PLUGIN_REPO_ENS_NAME, [
    {
      versionTag: [VERSION.release, VERSION.build],
      pluginSetupContract: setup.address,
      releaseMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(releaseMetadataURI)
      ),
      buildMetadata: ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes(buildMetadataURI)
      ),
    },
  ]);

  if (tx === undefined || !tx.to || !tx.data) {
    throw new Error(
      `Failed to populate ${PLUGIN_CONTRACT_NAME} Repo createVersion transaction`
    );
  }

  const blockNumberOfPublication = (await tx.wait()).blockNumber;

  if (setup == undefined || setup?.receipt == undefined) {
    throw Error('setup deployment unavailable');
  }

  const version = await pluginRepo['getLatestVersion(uint8)'](VERSION.release);
  if (VERSION.release !== version.tag.release) {
    throw Error('something went wrong');
  }

  const implementationAddress = await PluginSetup__factory.connect(
    setup.address,
    deployer
  ).implementation();

  console.log(
    `Published ${PLUGIN_SETUP_CONTRACT_NAME} at ${setup.address} in PluginRepo ${PLUGIN_REPO_ENS_NAME} at ${pluginRepo.address} at block ${blockNumberOfPublication}.`
  );

  addCreatedVersion(
    network.name,
    {release: VERSION.release, build: version.tag.build},
    {release: releaseMetadataURI, build: buildMetadataURI},
    blockNumberOfPublication,
    {
      name: PLUGIN_SETUP_CONTRACT_NAME,
      address: setup.address,
      args: [],
      blockNumberOfDeployment: setup.receipt.blockNumber,
    },
    {
      name: PLUGIN_CONTRACT_NAME,
      address: implementationAddress,
      args: [],
      blockNumberOfDeployment: setup.receipt.blockNumber,
    },
    []
  );
};

export default func;
func.tags = [PLUGIN_SETUP_CONTRACT_NAME, 'Publish', 'Populate'];
