import Enmap from "enmap";
import { DateTime, Duration } from "luxon";
import { Player } from "./Player";
import { Client } from "./Client";

export interface Duel {
  challengerID: string;
  challengedID: string | undefined;
  startDate: DateTime;
  endDate: DateTime;
  validity: Duration;
  betAmount: number;
  global: boolean;
}

export class DuelHistory {

  getValidDuel(client: Client, challenger: Player, challengedPlayer: Player, betAmount: number, date: DateTime) {
    //console.log(this.current);
    var duels = this.current.filter(
      (duelObj) =>
        ((duelObj.challengerID === challengedPlayer.id && duelObj.challengedID === challenger.id) || duelObj.global) &&
        duelObj.betAmount === betAmount &&
        (date > duelObj.startDate && date < duelObj.endDate)
    );
    if (duels.length >= 1) {
      var validDuel = duels[duels.length - 1];
      if (validDuel.challengedID && client.duelResultHistory.getDuelResult(validDuel.challengerID, validDuel.challengedID, validDuel.startDate, validDuel.betAmount)) {
        return false;
      }
      else if (validDuel.global && client.duelResultHistory.getDuelResultWithObj(validDuel)) {
        return false;
      } else {
        return validDuel;
      }
    } else {
      return false;
    }
  }

  getUnresolvedDuels(client: Client, challenger: Player): Duel[] {
    var duels = this.current.filter(
      (duelObj) =>
        (duelObj.challengerID === challenger.id && !client.duelResultHistory.getDuelResultWithObj(duelObj) && duelObj.endDate.toSeconds() > DateTime.now().toSeconds())
    );
    return duels;
  }

  id = "main";
  private static db = new Enmap("duel_history");
  allTime: Duel[] = [];
  current: Duel[] = [];

  checkDateTime(inp: string | DateTime): DateTime {
    if (typeof (inp) === "string") return DateTime.fromISO(inp);
    return inp;
  }

  checkDuration(inp: string | Duration): Duration {
    if (typeof (inp) === "string") return Duration.fromISO(inp);
    return inp;
  }

  constructor() {
    const data = DuelHistory.db.get(this.id);
    Object.assign(this, data);
    for (let duel of this.allTime) {
      (duel.endDate) ? duel.endDate = this.checkDateTime(duel.endDate) : null;
      (duel.startDate) ? duel.startDate = this.checkDateTime(duel.startDate) : null;
      (duel.validity) ? duel.validity = this.checkDuration(duel.validity) : null;
    }
    for (let duel of this.current) {
      (duel.endDate) ? duel.endDate = this.checkDateTime(duel.endDate) : null;
      (duel.startDate) ? duel.startDate = this.checkDateTime(duel.startDate) : null;
      (duel.validity) ? duel.validity = this.checkDuration(duel.validity) : null;
    }
  }

  addDuel(duel: Duel) {
    this.allTime.push(duel);
    this.current.push(duel);
  }

  // Clears current battle duels. Should be called on "end" stage
  clear() {
    this.current = [];
  }

  save() {
    DuelHistory.db.set(this.id, { ...this });
  }
}
