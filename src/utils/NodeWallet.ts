export class NodeWallet {
    private secretKey: string;
  
    constructor(secretKey: string) {
      this.secretKey = secretKey;
    }
  
    async getPKH(): Promise<string> {
      return this.secretKey;
    }
  }