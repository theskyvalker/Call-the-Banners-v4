import { Player } from "./Player";
import { v4 } from "uuid";
import { client } from "..";

export class Ticket {
  id: string;
  static price = 100;
  ownerID?: string;

  constructor() {
    this.id = v4().split("-")[0];
  }

  // gets all saved ticket id
  static get all(): string[] {
    return client.players.reduce(
      (acc, player) => acc.concat(...(player.tickets || [])),
      []
    );
  }

  get owner() {
    if (!this.ownerID) return;
    return Player.fromID(this.ownerID);
  }

  static fromID(id: string) {
    const ticket = new Ticket();
    ticket.id = id;
    return ticket;
  }
}
