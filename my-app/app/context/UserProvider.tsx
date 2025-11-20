'use client';

import { ReactNode, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { testlockedvaultABI } from '@/app/lib/testlockedvaultABI';
import { connect } from '@/app/lib/connect';
import { UserContext } from './UserContext';

type Props = { children: ReactNode };

export default function UserProvider({ children }: Props) {
    const [address, setAddress] = useState<string | null>(null);
    const [provider, setProvider] = useState<any | null>(null);
    const [signer, setSigner] = useState<any | null>(null);
    const [contractRead, setContractRead] = useState<any | null>(null);
    const [contractWrite, setContractWrite] = useState<any | null>(null);
    const [connecting, setConnecting] = useState<boolean | null>(null);


    useEffect(() => {
        (async () => {
            const contractAbi = testlockedvaultABI;
            const contractAddress = '0x3C0Dc4Cb1975aAD3c3752185f7387301D93fc6Bb';

            try {
                setConnecting(true);

                const res = await connect();
                if (!res) return;

                if (res.address) setAddress(res.address);
                if (res.provider) setProvider(res.provider);
                if (res.signer) setSigner(res.signer);

                const read = new ethers.Contract(contractAddress, contractAbi, res.provider);
                const write = new ethers.Contract(contractAddress, contractAbi, res.signer);

                setContractRead(read);
                setContractWrite(write);
                console.log(res.address);
            } catch (err) {
                console.error("Wallet connect error:", err);
            } finally {
                setConnecting(false);

            }

        })();
    }, []);

    return (
        <UserContext.Provider value={{ address, provider, signer, contractRead, contractWrite, connecting }}>
            {children}
        </UserContext.Provider>
    );
}
