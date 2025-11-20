// lib/ipfs.ts
const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT!;
const IPFS_GATEWAY =
  process.env.NEXT_PUBLIC_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

export async function uploadEncryptedString(
  encrypted: string,
  filename: string
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("NEXT_PUBLIC_PINATA_JWT is not set");
  }

  const blob = new Blob([encrypted], { type: "text/plain" });
  const file = new File([blob], `${filename}.enc.txt`, { type: "text/plain" });

  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Pinata error:", text);
    throw new Error("Failed to upload to Pinata");
  }

  const json = await res.json();
  // Pinata returns { IpfsHash, PinSize, Timestamp }
  return json.IpfsHash as string;
}

export async function downloadEncryptedString(cid: string): Promise<{
  encrypted: string;
  filename: string;
}> {
  const url = `${IPFS_GATEWAY}${cid}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch from IPFS gateway");
  }

  const encrypted = await res.text();

  return {
    encrypted,
    filename: `file-${cid.slice(0, 8)}`,
  };
}
