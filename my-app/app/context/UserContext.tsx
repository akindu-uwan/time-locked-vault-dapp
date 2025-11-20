'use client';

import { createContext, useContext } from 'react';

export type Web3Ctx = {
  address: string | null;
  provider: any | null;
  signer: any | null;
  contractRead: any | null;
  contractWrite: any | null;
  connecting: boolean | null;
};

export const UserContext = createContext<Web3Ctx>({
  address: null,
  provider: null,
  signer: null,
  contractRead: null,
  contractWrite: null,
  connecting: null
});

export const useUser = () => useContext(UserContext);
