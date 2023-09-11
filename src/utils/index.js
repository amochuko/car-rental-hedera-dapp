import { ethers } from 'ethers';

// @ts-ignore
export const provider = new ethers.providers.Web3Provider(window.ethereum);
