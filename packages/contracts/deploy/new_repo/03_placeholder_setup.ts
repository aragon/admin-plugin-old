import placeholderBuildMetadata from '@aragon/osx/plugins/placeholder-version/build-metadata.json';
import {uploadToIPFS} from '../helpers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {deploy} = deployments;
  const [deployer] = await ethers.getSigners();

  await deploy('PlaceholderSetup', {
    contract: "PlaceholderSetup",
    from: deployer.address,
    args: [],
    log: true,
  });

  const {network} = hre;

  hre.placeholderBuildCIDPath = await uploadToIPFS(
    JSON.stringify(placeholderBuildMetadata),
    network.name
  );
};

export default func;
func.tags = ['PlaceholderSetup', 'NewRepo'];
