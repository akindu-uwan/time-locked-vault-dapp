"use client";

import { useEffect, useState, useContext } from "react";
import {
  encryptFile,
  decryptToBlob,
  generateRandomPassword,
} from "./lib/encryption";
import {
  uploadEncryptedString,
  downloadEncryptedString,
} from "./lib/ipfs";
import { UserContext } from "@/app/context/UserContext";

//TokenModule#TimeLockedVault - 0x3C0Dc4Cb1975aAD3c3752185f7387301D93fc6Bb

type SimpleVault = {
  index: number;
  ipfsHash: string;
  unlockTime: number;
  unlocked: boolean;
};

export type VaultStruct = {
  owner: string;
  ipfsHash: string;
  unlockTime: bigint;
  encryptedKey: string;
  unlocked: boolean;
};

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [vaults, setVaults] = useState<SimpleVault[]>([]);
  const [isLocking, setIsLocking] = useState(false);
  const [isLoadingVaults, setIsLoadingVaults] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const web3 = useContext(UserContext);
  const account = web3.address;
  const isConnecting = !!web3.connecting;

  const nowTs = Math.floor(Date.now() / 1000);

  async function loadVaults(userAddress?: string) {
    try {
      setIsLoadingVaults(true);

      const addr = userAddress ?? account;
      if (!addr) return;

      if (!web3.contractWrite) {
        console.warn("contractWrite not ready yet, cannot load vaults");
        return;
      }

      const rawVaults = (await web3.contractWrite.getVaults(
        addr
      )) as VaultStruct[];

      const mapped: SimpleVault[] = rawVaults.map((v, idx) => ({
        index: idx,
        ipfsHash: v.ipfsHash,
        unlockTime: Number(v.unlockTime),
        unlocked: v.unlocked,
      }));

      setVaults(mapped);
    } catch (err) {
      console.error("Error loading vaults:", err);
    } finally {
      setIsLoadingVaults(false);
    }
  }

  async function handleLock() {
    if (!account) {
      alert("Connect your wallet first.");
      return;
    }

    if (!file) {
      alert("Please select a file.");
      return;
    }

    if (!web3.contractWrite) {
      alert("Wallet / contract not ready yet.");
      return;
    }

    try {
      setStatus(null);
      setIsLocking(true);

      const password = generateRandomPassword(32);

      setStatus("Encrypting file...");
      const encryptedString = await encryptFile(file, password);

      setStatus("Uploading encrypted file to IPFS...");
      const cid = await uploadEncryptedString(encryptedString, file.name);

      const now = Math.floor(Date.now() / 1000);
      const months = durationMonths;
      const secondsPerMonth = 30 * 24 * 60 * 60; // ~30 days
      const unlockTime = now + months * secondsPerMonth;

      setStatus("Creating vault on-chain...");

      const tx = await web3.contractWrite.createVault(
        cid,
        password,
        unlockTime
      );
      await tx.wait();

      setStatus("Vault created successfully!");
      setFile(null);

      await loadVaults(account);
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Error while creating vault");
    } finally {
      setIsLocking(false);
      setTimeout(() => setStatus(null), 5000);
    }
  }

  async function handleUnlock(vault: SimpleVault) {
    if (!web3.contractWrite) {
      alert("Wallet / contract not ready yet.");
      return;
    }

    try {
      setStatus("Unlocking via smart contract...");

      const password: string =
        await web3.contractWrite.unlockVault.staticCall(vault.index);

      const tx = await web3.contractWrite.unlockVault(vault.index);
      await tx.wait();

      setStatus("Downloading encrypted file from IPFS...");
      const { encrypted, filename } = await downloadEncryptedString(
        vault.ipfsHash
      );

      setStatus("Decrypting file...");
      const blob = decryptToBlob(encrypted, password);

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `unlocked-${filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus("File unlocked and downloaded!");

      await loadVaults(account ?? undefined);
    } catch (err: any) {
      console.error(err);
      alert(err.message ?? "Error while unlocking vault");
      setStatus(null);
    }
  }

  useEffect(() => {
    if (account && web3.contractWrite) {
      loadVaults(account);
    }
    
  }, [account, web3.contractWrite]);

  return (
    <main className="space-y-8">
      <header className="flex flex-col gap-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          ⏱️ Time Capsule
        </h1>
        <p className="text-slate-300">
          Encrypt files in your browser, store them on IPFS, and lock the
          decryption key on Ethereum until a future date.
        </p>
      </header>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">Wallet</div>
          {account ? (
            <div className="font-mono text-sm">
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <div className="text-slate-400 text-sm">
              {isConnecting
                ? "Connecting to wallet..."
                : "Not connected. Please connect in MetaMask."}
            </div>
          )}
        </div>
        <button
          disabled={true}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm opacity-60 cursor-not-allowed"
        >
          {isConnecting
            ? "Connecting..."
            : account
            ? "Connected"
            : "Awaiting connection"}
        </button>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">Create new time-locked vault</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1 text-slate-300">
              Select file
            </label>
            <input
              type="file"
              className="block w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setFile(e.target.files[0]);
                } else {
                  setFile(null);
                }
              }}
            />
            {file && (
              <p className="mt-1 text-xs text-slate-400">
                Selected: <span className="font-mono">{file.name}</span>{" "}
                ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1 text-slate-300">
              Lock duration (months)
            </label>
            <select
              value={durationMonths}
              onChange={(e) => setDurationMonths(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>

          <button
            onClick={handleLock}
            disabled={!account || !file || isLocking || !web3.contractWrite}
            className="mt-2 inline-flex items-center px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-sm font-semibold text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {isLocking ? "Locking..." : "Encrypt & Lock on-chain"}
          </button>

          {status && (
            <p className="text-xs text-emerald-300 animate-pulse">{status}</p>
          )}
        </div>
      </section>

      <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your vaults</h2>
          <button
            onClick={() => account && loadVaults(account)}
            disabled={!account || isLoadingVaults}
            className="text-xs px-3 py-1 rounded-full border border-slate-700 hover:border-emerald-500 hover:text-emerald-300 transition disabled:opacity-50"
          >
            {isLoadingVaults ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {!account && (
          <p className="text-sm text-slate-400">
            Connect your wallet to view your vaults.
          </p>
        )}

        {account && vaults.length === 0 && !isLoadingVaults && (
          <p className="text-sm text-slate-400">
            No vaults yet. Create one above.
          </p>
        )}

        <div className="space-y-3">
          {vaults.map((vault) => {
            const isUnlockable =
              nowTs >= vault.unlockTime && !vault.unlocked;
            const unlockDate = new Date(
              vault.unlockTime * 1000
            ).toLocaleString();

            return (
              <div
                key={vault.index}
                className="border border-slate-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-950/60"
              >
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    Vault #{vault.index}
                  </div>
                  <div className="text-xs text-slate-400">
                    IPFS CID:{" "}
                    <span className="font-mono break-all">
                      {vault.ipfsHash}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Unlock time:{" "}
                    <span className="font-mono">{unlockDate}</span>
                  </div>
                  <div className="text-xs">
                    Status:{" "}
                    {vault.unlocked ? (
                      <span className="text-emerald-400 font-medium">
                        Unlocked
                      </span>
                    ) : isUnlockable ? (
                      <span className="text-amber-300 font-medium">
                        Ready to unlock
                      </span>
                    ) : (
                      <span className="text-slate-400">Locked</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => handleUnlock(vault)}
                    disabled={!isUnlockable || !web3.contractWrite}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed transition"
                  >
                    Unlock & Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
