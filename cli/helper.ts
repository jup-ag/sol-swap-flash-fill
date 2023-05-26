import * as anchor from "@coral-xyz/anchor";
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { IDL, FlashSwap } from "../target/types/flash_swap";
import {
  PublicKey,
  Keypair,
  Connection,
  AddressLookupTableAccount,
} from "@solana/web3.js";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export const programId = new PublicKey(
  "JUPLdTqUdKztWJ1isGMV92W2QvmEmzs9WTJjhZe4QdJ"
);
export const wallet = new Wallet(
  Keypair.fromSecretKey(bs58.decode(process.env.KEYPAIR))
);
export const connection = new Connection(process.env.RPC_URL);
export const provider = new AnchorProvider(connection, wallet, {
  commitment: "processed",
});
anchor.setProvider(provider);
export const program = new Program<FlashSwap>(IDL, programId, provider);

const findProgramAuthority = (): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    programId
  )[0];
};
export const programAuthority = findProgramAuthority();
console.log({ programAuthority: programAuthority.toBase58() });

export const findAssociatedTokenAddress = ({
  walletAddress,
  tokenMintAddress,
}: {
  walletAddress: PublicKey;
  tokenMintAddress: PublicKey;
}): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      walletAddress.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      tokenMintAddress.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
};

export const borrowerWSOLAddress = findAssociatedTokenAddress({
  walletAddress: wallet.publicKey,
  tokenMintAddress: NATIVE_MINT,
});

export const getAdressLookupTableAccounts = async (
  keys: string[]
): Promise<AddressLookupTableAccount[]> => {
  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      keys.map((key) => new PublicKey(key))
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const addressLookupTableAddress = keys[index];
    if (accountInfo) {
      const addressLookupTableAccount = new AddressLookupTableAccount({
        key: new PublicKey(addressLookupTableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(addressLookupTableAccount);
    }

    return acc;
  }, new Array<AddressLookupTableAccount>());
};
