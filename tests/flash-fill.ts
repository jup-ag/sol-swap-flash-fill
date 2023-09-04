import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FlashFill } from "../target/types/flash_fill";
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  NATIVE_MINT,
  createCloseAccountInstruction,
} from "@solana/spl-token";
import { expect } from "chai";

const WALLET_RENT_EXEMPT_MINIMUM = 890_880;
const LAMPORTS_PER_SIGNATURE = 5000;
const TOKEN_ACCOUNT_LAMPORTS = 2_039_280;

describe("flash-fill", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider();
  const program = anchor.workspace.FlashSwap as Program<FlashFill>;
  const borrower = new Keypair();
  const connection = provider.connection;
  const programAuthority = PublicKey.findProgramAddressSync(
    [Buffer.from("authority")],
    program.programId
  )[0];

  it("is working", async () => {
    const transferToProgramAuthorityInstruction = SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: programAuthority,
      lamports: TOKEN_ACCOUNT_LAMPORTS + WALLET_RENT_EXEMPT_MINIMUM, // Enough to cover 2 transactions.
    });

    const transferToBorrowerInstruction = SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: borrower.publicKey,
      lamports: LAMPORTS_PER_SIGNATURE * 4 + WALLET_RENT_EXEMPT_MINIMUM, // Enough to cover 2 transactions.
    });

    await provider.sendAndConfirm(
      new Transaction().add(
        transferToProgramAuthorityInstruction,
        transferToBorrowerInstruction
      )
    );

    const borrowIx = await program.methods
      .borrow()
      .accountsStrict({
        borrower: borrower.publicKey,
        programAuthority,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const wSOLAccountAddress = await getAssociatedTokenAddress(
      NATIVE_MINT,
      borrower.publicKey
    );

    const createWSOLAccountIx =
      createAssociatedTokenAccountIdempotentInstruction(
        borrower.publicKey,
        wSOLAccountAddress,
        borrower.publicKey,
        NATIVE_MINT
      );

    const closeWSOLAccountIx = createCloseAccountInstruction(
      wSOLAccountAddress,
      borrower.publicKey,
      borrower.publicKey
    );

    const repayIx = await program.methods
      .repay()
      .accountsStrict({
        borrower: borrower.publicKey,
        programAuthority,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .instruction();

    const tx = new Transaction().add(
      borrowIx,
      createWSOLAccountIx,
      closeWSOLAccountIx,
      repayIx
    );

    let success1 = true;
    try {
      await sendAndConfirmTransaction(connection, tx, [borrower]);
    } catch (e) {
      console.log(e);
      success1 = false;
    }
    expect(success1).to.be.true;

    const failedTx1 = new Transaction().add(
      borrowIx,
      createWSOLAccountIx,
      closeWSOLAccountIx
    );

    let success2 = true;
    try {
      await sendAndConfirmTransaction(connection, failedTx1, [borrower]);
    } catch (e) {
      console.log(e);
      success2 = false;
    }
    expect(success2).to.be.false;

    const failedTx2 = new Transaction().add(
      borrowIx,
      borrowIx,
      createWSOLAccountIx,
      closeWSOLAccountIx,
      repayIx
    );

    let success3 = true;
    try {
      await sendAndConfirmTransaction(connection, failedTx2, [borrower]);
    } catch (e) {
      console.log(e);
      success3 = false;
    }
    expect(success3).to.be.false;
  });
});
