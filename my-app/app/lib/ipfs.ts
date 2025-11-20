// lib/ipfs.ts
import { Web3Storage } from "web3.storage";

let client: Web3Storage | null = null;

function getClient(): Web3Storage {
  if (!client) {
    const token = process.env.NEXT_PUBLIC_WEB3STORAGE_TOKEN;
    if (!token) {
      throw new Error("NEXT_PUBLIC_WEB3STORAGE_TOKEN is not set");
    }
    client = new Web3Storage({ token });
  }
  return client;
}

/**
 * Upload encrypted string as a text file to IPFS.
 */
export async function uploadEncryptedString(
  encrypted: string,
  filename: string
): Promise<string> {
  const c = getClient();
  const blob = new Blob([encrypted], { type: "text/plain" });
  const file = new File([blob], `${filename}.enc.txt`, {
    type: "text/plain",
  });
  const cid = await c.put([file], {
    wrapWithDirectory: false,
  });
  return cid;
}

/**
 * Download encrypted string + filename from IPFS using CID.
 */
export async function downloadEncryptedString(cid: string): Promise<{
  encrypted: string;
  filename: string;
}> {
  const c = getClient();
  const res = await c.get(cid);
  if (!res) {
    throw new Error("No response from Web3.Storage");
  }
  const files = await res.files();
  if (!files || files.length === 0) {
    throw new Error("No files found for CID");
  }
  const file = files[0];
  const encrypted = await file.text();
  return {
    encrypted,
    filename: file.name.replace(/\.enc\.txt$/, ""),
  };
}
