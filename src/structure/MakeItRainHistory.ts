import Enmap from "enmap";
import { DateTime } from "luxon";

export interface MakeItRain {
  playerID: string; // general who started it
  time_start: DateTime; // time started
  time_end: DateTime; // time ending
  castle: string, // target castle
  amount: number;
}

export class MakeItRainHistory {
  id = "main";
  private static db = new Enmap({ "name": "make_it_rain_history" });
  allTime: MakeItRain[] = [];

  constructor() {
    const data = MakeItRainHistory.db.get(this.id);
    (data) ? this.loadData(data) : null;
  }

  loadData(data: { id: string; allTime: string | any[]; }) {
    this.id = data.id;
    for (var i = 0; i < data.allTime.length; ++i) {
      this.allTime.push(
        {
          'playerID': data.allTime[i].playerID,
          'time_start': DateTime.fromISO(data.allTime[i].time_start),
          'time_end': DateTime.fromISO(data.allTime[i].time_end),
          'castle': data.allTime[i].castle,
          'amount': data.allTime[i].amount
        }
      )
    }
  }

  getValidMakeItRain(castle: string, timeofattack: DateTime) {
    var bounties = this.allTime.filter(
      (makeitrainObj) =>
        makeitrainObj.castle === castle && (timeofattack > makeitrainObj.time_start && timeofattack < makeitrainObj.time_end)
    );
    return bounties[bounties.length - 1];
  }

  addMakeItRain(makeitrain: MakeItRain) {
    this.allTime.push(makeitrain);
  }

  save() {
    MakeItRainHistory.db.set(this.id, { ...this });
  }

  delete() {
    MakeItRainHistory.db.deleteAll();
  }
}