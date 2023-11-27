import {
  DAO,
  DAO__factory,
} from '../typechain';
import {deployWithProxy} from './proxy';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/signers';
import {ethers} from 'hardhat';

export const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
export const daoExampleURI = 'https://example.com';

export const TOKEN_INTERFACE_IDS = {
  erc721ReceivedId: '0x150b7a02',
  erc1155ReceivedId: '0xf23a6e61',
  erc1155BatchReceivedId: '0xbc197c81',
  erc721InterfaceId: '0x150b7a02',
  erc1155InterfaceId: '0x4e2312e0',
};

export async function deployNewDAO(signer: SignerWithAddress): Promise<DAO> {
  const DAO = new DAO__factory(signer);
  const dao = await deployWithProxy<DAO>(DAO);

  await dao.initialize(
    '0x00',
    signer.address,
    ethers.constants.AddressZero,
    daoExampleURI
  );

  return dao;
}
