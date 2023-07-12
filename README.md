# Flash Swap

This borrows the concept of flash loan but instead of borrowing any amount the borrower wants. Borrower can only
borrow the required amount for creating a wSOL account. This is to solve a problem when a borrower may not have
enough SOL to do anything when swapping through Jupiter.

With this, the borrower can immediately swap any tokens on Jupiter to SOL even if they don't have enough to open
a wSOL account.

For an implementatin that uses Jupiter Swap as CPI, you can check out: https://github.com/jup-ag/swap-to-sol. The
CPI implementation has one problem tho, it may run into CPI size limit.

## How this works?

For a flash swap to work, the transaction will be composed of these instructions:

1. Borrow enough SOL for opening the wSOL account from this program.
2. Create the wSOL account for the borrower.
3. Swap X token to wSOL.
4. Close the wSOL account and send it to the borrower.
5. Repay the SOL for opening the wSOL account back to this program.

* Example: `./cli/flash-swap.ts`
* Transaction: https://solscan.io/tx/3ekwFGnYu3CLS7xHfdoJqV2JRErUJ2ayYLyUA71StdbxtYr8oRgiXRHbQBP2u7iuZugx4RkstxMMgzr4ychv4VRc

## References:

* https://github.com/moshthepitt/flash-loan-mastery
* https://github.com/2501babe/adobe
