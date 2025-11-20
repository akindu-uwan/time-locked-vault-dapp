'use client';

import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export async function connect() {

  if (typeof window === "undefined") return null;

  if (!window.ethereum) {
    alert("MetaMask not detected. Please install MetaMask and refresh.");

    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);

    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
    });

    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // console.log("Connected:", address);
    return { provider, signer, address };
  } catch (err) {
    console.error("MetaMask connection failed:", err);
    throw err;
  }
}
