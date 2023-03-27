import Enmap from "enmap";
import { v4 as uuidv4 } from "uuid";
import { Castle } from "../structure/Castle";
import { getMultiplier, getMultiplierv2 } from "../utils";
import { Player } from "./Player";

interface Load {
  uid?: string;
  playerID: string[];
  castle: string;
  date: Date;
  attack?: number[];
  minAttack: number;
  maxAttack: number;
  multiplier?: number;
  final?: number;
  used?: boolean;
}

export class LoadHistory {
  id = "main";
  private static db = new Enmap("load_history");
  allTime: Load[] = [];
  current: Load[] = [];

  constructor() {
    const data = LoadHistory.db.get(this.id);
    Object.assign(this, data);
  }

  addLoad(castleName: string, id: string, att: number) {
    const loadCheck = this.current.filter(
      (x) => x.castle === castleName && x.used === true
    );
    if (loadCheck.length >= 2) {
      throw new Error("Used ballista for 2 times!");
    }

    let loadData = this.current.find(
      (x) => x.castle === castleName && x.used === false
    );

    loadData?.playerID?.forEach((objid) => {
      if (objid === id) {
        throw new Error("You already loaded before");
      }
    });

    if (loadData) {
      if (loadData.playerID.length >= 5) {
        throw new Error("5 Players already loaded!");
      }

      loadData.playerID?.push(id);
      loadData.attack?.push(att);
      const attacker = Player.fromID(id);
      if (attacker) {
        (loadData.maxAttack) ? loadData.maxAttack += attacker.maxAttack : loadData.maxAttack = attacker.maxAttack;
        (loadData.minAttack) ? loadData.minAttack += attacker.minAttack : loadData.minAttack = attacker.minAttack;
      }
      return;
    }

    /**
     *  Create new load data
     */
    const castle: Castle = Castle.fromName(castleName);
    const enemy: Castle = Castle.getEnemy(castleName);

    if (castle.hp >= enemy.hp) {
      throw new Error("Current castle hp is higher than enemy castle");
    }

    const uid = uuidv4();
    let playerID = [id];
    let attack = [att];
    const attacker = Player.fromID(id);
    let maxAttack = 0, minAttack = 0;
    if (attacker) {
      maxAttack = attacker.maxAttack;
      minAttack = attacker.minAttack;
    }
    let data: Load = {
      castle: castleName,
      date: new Date(),
      uid,
      playerID,
      attack,
      minAttack,
      maxAttack,
      used: false,
    };

    this.allTime.push(data);
    this.current.push(data);
  }

  fireLoad(CastleName: string) {
    const castle = Castle.fromName(CastleName);

    const loadData = this.current.find(
      (x) => x.castle === castle.name && x.used === false
    );

    if (loadData?.playerID?.length != 5) {
      throw new Error(
        `You only have ${loadData?.playerID?.length ? loadData?.playerID?.length : "0"
        } loaded`
      );
    }

    const attackSum = loadData.attack?.reduce(
      (previousValue, currentValue) => previousValue + currentValue,
      0
    );

    loadData.used = true;
    console.log(loadData);
    if (attackSum) {
      const hpDiff = Castle.getEnemy(CastleName).hp - castle.hp;
      loadData.multiplier = getMultiplierv2(hpDiff);
      console.log(loadData.multiplier);
      console.log(attackSum);
      console.log(Math.round(75. * 5));
      let normAttack = attackSum / ((loadData.maxAttack + loadData.minAttack) / 2); //compare to average
      console.log(normAttack);
      if (normAttack > 1) {
        normAttack = 1; // cap at 100% effectiveness if it meets the average
      }
      loadData.final = Math.round(normAttack * loadData.multiplier * hpDiff);
      console.log(loadData.final);
    }
    return loadData;
  }

  clear() {
    this.current = [];
  }

  save() {
    LoadHistory.db.set(this.id, { ...this });
  }
}
