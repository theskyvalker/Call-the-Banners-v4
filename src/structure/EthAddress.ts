import Enmap from "enmap";

export interface EthAddressData {
  name: string;
  id: string;
  address: string;
}
export class EthAddress {
  id = "main";
  private static db = new Enmap("eth_address");
  allTime: EthAddressData[] = [];

  constructor() {
    const data = EthAddress.db.get(this.id);
    Object.assign(this, data);
  }

  addEth(eth: EthAddressData) {
    for (let ethdata of this.allTime) {
      if (ethdata.id === eth.id) {
        ethdata.address = eth.address;
        return;
      }
    }
    this.allTime.push(eth);
  }

  findAddress(id: string): string | undefined {
    for (let data of this.allTime) {
      if (data.id === id) {
        return data.address;
      }
    }
    return undefined;
  }

  clear() {
    this.allTime = [];
  }

  save() {
    EthAddress.db.set(this.id, { ...this });
  }
}
