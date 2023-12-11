import {PLUGIN_CONTRACT_NAME} from '../../plugin-settings';
import {PluginRepo__factory, PluginRepoFactory__factory} from '../../typechain';
import {getPluginInfo, getPluginRepoFactoryAddress} from '../../utils/helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('\nUpgrade the PluginRepo to the new implementation');

  const {network} = hre;
  const [deployer] = await hre.ethers.getSigners();

  const pluginRepoFactoryAddress = await getPluginRepoFactoryAddress(
    network.name
  );

  const newPluginRepoImplementation = await PluginRepoFactory__factory.connect(
    pluginRepoFactoryAddress,
    hre.ethers.provider
  ).pluginRepoBase();

  const pluginRepo = PluginRepo__factory.connect(
    getPluginInfo(network.name)[network.name]['address'],
    deployer
  );

  const upgradeTX = await pluginRepo.populateTransaction.upgradeTo(
    newPluginRepoImplementation
  );

  if (!upgradeTX.to || !upgradeTX.data) {
    throw new Error(`Failed to populate upgradeTo transaction`);
  }

  hre.managingDAOActions.push({
    to: upgradeTX.to,
    data: upgradeTX.data,
    value: 0,
    description: `Upgrade the ${PLUGIN_CONTRACT_NAME}'s PluginRepo (${pluginRepo.address}) to the new implementation (${newPluginRepoImplementation})`,
  });
};
export default func;
func.tags = ['UpgradeRepo'];
