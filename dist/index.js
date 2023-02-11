var app = new Vue({
  el: "#app",
  data: {
    status: "",
    invoice: "",
    token: "",
    amountLabel: "",
    showCheckFeeButton: false,
    showTokenInput: false,
    showPayButton: false,
    payAmount: 0,
    decodedInvoice: null,
  },
  methods: {
    checkInvoice: async function () {
      try {
        var bolt11 = this.invoice;
        const wallet = new Wallet("");
        this.decodedInvoice = wallet.decodeInvoice(bolt11);
        this.payAmount =
          this.decodedInvoice.satoshis +
          Math.max(2, this.decodedInvoice.satoshis * 0.02);
        this.amountLabel = `Provide tokens worth ${this.payAmount} sats (${this.decodedInvoice.satoshis} sats + fees).`;
        this.showTokenInput = true;
      } catch (error) {
        this.status = error;
      }
    },
    pay: async function () {
      try {
        var tokenBase64 = this.token;
        var token = JSON.parse(atob(tokenBase64));
        const mintUrl = token.mints[0].url;
        const wallet = new Wallet(mintUrl);

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
        await wallet.melt(this.invoice);
        this.status = "Invoice paid ⚡️";
      } catch (error) {
        this.status = error;
      }
    },
  },
  mounted() {},
});
