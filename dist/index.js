var app = new Vue({
  el: "#app",
  data: {
    status: "",
    invoice: "",
    token: "",
    amountLabel: "",
    showCheckFeeButton: false,
    showTokenInput: true,
    showPayButton: false,
    showInvoiceInput: false,
    payAmount: 0,
    decodedInvoice: null,
  },
  methods: {
    checkToken: async function () {
      try {
        var tokenBase64 = this.token;
        var token = JSON.parse(atob(tokenBase64));
        const mintUrl = token.mints[0].url;
        const wallet = new Wallet(mintUrl);
        wallet.loadMint();
        let spendable = await wallet.checkSpendable(token.proofs);
        if (!spendable) {
          throw Error("Token already spent.");
        }
        let tokenAmount = wallet.sumProofs(token.proofs);
        this.payAmount = tokenAmount - Math.max(2, tokenAmount * 0.02);
        this.amountLabel = `Enter Lightning invoice for ${this.payAmount} sats (incl. network fees).`;
        this.showInvoiceInput = true;
      } catch (error) {
        this.status = error;
      }
    },
    pay: async function () {
      try {
        this.status = "";
        var tokenBase64 = this.token;
        var bolt11 = this.invoice;

        var token = JSON.parse(atob(tokenBase64));
        const mintUrl = token.mints[0].url;
        const wallet = new Wallet(mintUrl);
        this.decodedInvoice = wallet.decodeInvoice(bolt11);

        // check if tokens are actually enough by checking the fees
        const amountWithFees =
          this.decodedInvoice.satoshis + (await wallet.checkFees(this.invoice));

        // check if tokens are worth the payAmount
        if (wallet.sumProofs(token.proofs) < amountWithFees) {
          throw Error(
            `Token amount too low (${wallet.sumProofs(
              token.proofs
            )} instead of ${amountWithFees})`
          );
        }

        wallet.loadMint();
        wallet.proofs = token.proofs;
        this.status = "Paying invoice ...";
        await wallet.melt(this.invoice);
        this.status = "Invoice paid ⚡️";
      } catch (error) {
        this.status = error;
      }
    },
  },
  mounted() {},
});
