var app = new Vue({
  el: "#app",
  data: {
    status: "",
    invoice: "",
    token: "",
    amountLabel: "",
    mintUrl: "",
    wallet: null,
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
        this.status = "";
        var tokenBase64 = this.token;
        var token = JSON.parse(atob(tokenBase64));
        this.mintUrl = token.mints[0].url;
        this.wallet = new Wallet(this.mintUrl);
        this.wallet.loadMint();
        let spendable = await this.wallet.checkSpendable(token.proofs);
        if (!spendable) {
          throw Error("Token already spent.");
        }
        let tokenAmount = this.wallet.sumProofs(token.proofs);
        let feeAmount = Math.ceil(Math.max(2, tokenAmount * 0.02));
        this.payAmount = tokenAmount - feeAmount;
        if (!(this.payAmount > 0)) {
          throw Error("Token amount is too low for a Lightning payment.");
        }
        this.amountLabel = `Receive ${this.payAmount} sats (incl. ${feeAmount} sats network fees) via Lightning.`;
        this.showInvoiceInput = true;
      } catch (error) {
        this.status = error;
      }
    },
    checkLnurl: async function () {
      // check whether the input is an lnurl and replace with bolt11 invoice
      let address = this.invoice;
      if (
        address.split("@").length != 2 &&
        address.toLowerCase().slice(0, 6) != "lnurl1"
      ) {
        return;
      }
      this.status = "Resolving LNURL ...";
      this.invoice = await this.wallet.lnurlPay(address, this.payAmount);
    },

    pay: async function () {
      try {
        await this.checkLnurl();
        this.status = "";
        var tokenBase64 = this.token;
        var bolt11 = this.invoice;

        var token = JSON.parse(atob(tokenBase64));
        this.decodedInvoice = this.wallet.decodeInvoice(bolt11);

        // check if tokens are actually enough by checking the fees
        const amountWithFees =
          this.decodedInvoice.satoshis +
          (await this.wallet.checkFees(this.invoice));

        // check if tokens are worth the payAmount
        if (this.wallet.sumProofs(token.proofs) < amountWithFees) {
          throw Error(
            `Token amount too low (${this.wallet.sumProofs(
              token.proofs
            )} instead of ${amountWithFees})`
          );
        }

        this.wallet.loadMint();
        this.wallet.proofs = token.proofs;
        this.status = "Paying invoice ...";
        await this.wallet.melt(this.invoice);
        this.status = "Invoice paid ⚡️";
      } catch (error) {
        this.status = error;
      }
    },
  },
  created() {
    let params = new URL(document.location).searchParams;
    if (params.get("lnurl")) {
      this.invoice = params.get("lnurl");
    }
    if (params.get("token")) {
      this.token = params.get("token");
    }
  },
});
