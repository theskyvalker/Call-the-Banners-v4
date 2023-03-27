import Enmap from "enmap";
import { DateTime, Duration } from "luxon";
import { isAssertEntry } from "typescript";
import { Player } from "./Player";
import { Duel } from "./DuelHistory";

export interface DuelResult {
  challengerID: string;
  challengedID: string;
  startDate: DateTime;
  endDate: DateTime;
  acceptDate: DateTime;
  validity: Duration;
  betAmount: number;
  winnerID: string | undefined;
  winnings: number;
  challengerDamage: number;
  challengedDamage: number;
}

export class DuelResultHistory {

  public getDuelResult(challengerID: string, challengedID: string, startDate: DateTime, betAmount: number) {
    var results = this.allTime.filter(
      (duelObj) =>
        duelObj.challengerID === challengerID &&
        duelObj.challengedID == challengedID &&
        duelObj.startDate == startDate &&
        duelObj.betAmount == betAmount
    );
    if (results.length >= 1) {
      return true;
    } else {
      return false;
    }
  }

  public getDuelResultWithObj(validDuel: Duel): boolean {
    var results = this.allTime.filter(
      (duelObj) =>
        duelObj.challengerID === validDuel.challengerID &&
        duelObj.startDate == validDuel.startDate &&
        duelObj.betAmount == validDuel.betAmount
    );
    if (results.length >= 1) {
      return true;
    } else {
      return false;
    }
  }

  public addPlayerWin(playerID: string, duelRanks: Array<{ playerID: string, metric: number }>): void {
    for (let entry of duelRanks) {
      if (entry.playerID === playerID) {
        entry.metric += 1;
        return;
      }
    }
    duelRanks.push({ playerID: playerID, metric: 1 });
  }

  public getDuelWonRankings(): Array<{ playerID: string, metric: number }> {
    //console.log(this.current);
    const duelRanks: Array<{ playerID: string, metric: number }> = [];
    for (let duel of this.current)
      if (duel.winnerID) this.addPlayerWin(duel.winnerID, duelRanks);
    return duelRanks.sort((a, b) => b.metric - a.metric);
  }

  public getDuelLostRankings(): Array<{ playerID: string, metric: number }> {
    //console.log(this.current);
    const duelRanks: Array<{ playerID: string, metric: number }> = [];
    for (let duel of this.current) {
      if (duel.winnerID && duel.challengerID != duel.winnerID)
        this.addPlayerWin(duel.challengerID, duelRanks);
      if (duel.winnerID && duel.challengedID != duel.winnerID)
        this.addPlayerWin(duel.challengedID, duelRanks);
    }
    return duelRanks.sort((a, b) => b.metric - a.metric);
  }

  checkDateTime(inp: string | DateTime): DateTime {
    if (typeof (inp) === "string") return DateTime.fromISO(inp);
    return inp;
  }

  checkDuration(inp: string | Duration): Duration {
    if (typeof (inp) === "string") return Duration.fromISO(inp);
    return inp;
  }

  id = "main";
  private static db = new Enmap("duel_result_history");
  allTime: DuelResult[] = [];
  current: DuelResult[] = [];

  constructor() {
    const data = DuelResultHistory.db.get(this.id);
    Object.assign(this, data);
    for (let duel of this.allTime) {
      (duel.endDate) ? duel.endDate = this.checkDateTime(duel.endDate) : null;
      (duel.startDate) ? duel.startDate = this.checkDateTime(duel.startDate) : null;
      (duel.validity) ? duel.validity = this.checkDuration(duel.validity) : null;
      (duel.acceptDate) ? duel.acceptDate = this.checkDateTime(duel.acceptDate) : null;
    }
    for (let duel of this.current) {
      (duel.endDate) ? duel.endDate = this.checkDateTime(duel.endDate) : null;
      (duel.startDate) ? duel.startDate = this.checkDateTime(duel.startDate) : null;
      (duel.validity) ? duel.validity = this.checkDuration(duel.validity) : null;
      (duel.acceptDate) ? duel.acceptDate = this.checkDateTime(duel.acceptDate) : null;
    }
  }

  addDuelResult(duel: DuelResult) {
    this.allTime.push(duel);
    this.current.push(duel);
  }

  // Clears current battle duel results. Should be called on "end" stage
  clear() {
    this.current = [];
  }

  save() {
    DuelResultHistory.db.set(this.id, { ...this });
  }
}
