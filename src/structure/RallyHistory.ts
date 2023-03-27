import Enmap from "enmap";
import { DateTime } from "luxon";

export interface Rally {
  generalID: string; // general who started it
  time_start: DateTime; // time started
  time_end: DateTime; // time ending
  castle: string, // target castle
  budget: number,
  coinSpent: number
}

export const RALLY_AMOUNT = 75; // amount that each sharpen through rally costs

export class RallyHistory {
  id = "main";
  private static db = new Enmap({ "name": "rally_history" });
  allTime: Rally[] = [];

  constructor() {
    const data = RallyHistory.db.get(this.id);
    (data) ? this.loadData(data) : null;
  }

  loadData(data: { id: string; allTime: string | any[]; }) {
    this.id = data.id;
    for (var i = 0; i < data.allTime.length; ++i) {
      this.allTime.push(
        {
          'generalID': data.allTime[i].generalID,
          'time_start': DateTime.fromISO(data.allTime[i].time_start),
          'time_end': DateTime.fromISO(data.allTime[i].time_end),
          'castle': data.allTime[i].castle,
          'budget': data.allTime[i].budget,
          'coinSpent': data.allTime[i].coinSpent
        }
      )
    }
  }

  getValidRally(castle: string, timeofattack: DateTime): Rally | null {

    var rallies = this.allTime.filter(
      (rallyObj) =>
        rallyObj.castle.toLowerCase() === castle.toLowerCase() && (timeofattack > rallyObj.time_start && timeofattack <= rallyObj.time_end)
    );

    return rallies[rallies.length - 1];
  }

  addRally(rally: Rally) {
    this.allTime.push(rally);
  }

  save() {
    RallyHistory.db.set(this.id, { ...this });
  }

  delete() {
    RallyHistory.db.deleteAll();
  }
}