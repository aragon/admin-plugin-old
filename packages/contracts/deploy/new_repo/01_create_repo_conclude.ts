import {
    PluginRepoFactory__factory,
    PluginRepo__factory,
  } from '../../typechain'
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {getPluginRepoFactoryAddress } from '../../utils/helpers';
import { PLUGIN_CONTRACT_NAME, PLUGIN_REPO_ENS_NAME } from '../../plugin-settings';
import { network } from 'hardhat';
  
  const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    console.log(`Concluding ${PLUGIN_CONTRACT_NAME} plugin's repo deployment.\n`);
    const [deployer] = await hre.ethers.getSigners();
  
    const pluginRepoFactoryAddress = await getPluginRepoFactoryAddress(network.name);

    const pluginRepoFactory = PluginRepoFactory__factory.connect(
      pluginRepoFactoryAddress,
      deployer
    );
  
    const initializeData =
      PluginRepo__factory.createInterface().encodeFunctionData('initialize', [
        deployer.address,
      ]);
  
    const pluginRepoBase = await pluginRepoFactory.pluginRepoBase();
  
    hre.aragonToVerifyContracts.push({
      address: hre.aragonPluginRepos[PLUGIN_REPO_ENS_NAME],
      args: [pluginRepoBase, initializeData],
    });
  };
  
  export default func;
  func.tags = ['PluginRepo', 'Verification'];
  