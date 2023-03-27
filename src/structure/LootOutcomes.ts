import { random } from "@jiman24/discordjs-utils";
import { LootHistory } from "./LootHistory";
import { Player } from "./Player";
import { checkDoubling } from "../utils";
import { readFileSync, writeFileSync } from "fs";
import { client } from "..";

const POSITIVE_CHANCE_RANGE = [0, 0]; // MIN_POSITIVE_LOOT_CHANCE, MAX_POSITIVE_LOOT_CHANCE
const NEGATIVE_CHANCE_FRACTION = 0; // FRACTION (0 to 1) of negative outcomes if positive loot outcome is not rolled

export interface LootOutcome {
    message: string;
    result: "positive" | "negative" | "neutral";
    rarity: string;
    coins: number;
    func?: (...args: any[]) => any;
    args?: [];
}

interface Buff {
    message: string,
    buffTarget: string,
    buffVal: number
}

interface Item {
    message: string,
    category: string,
    qty: number
}

interface Outcomes {
    "legendary": { func: (...args: any[]) => any; args: any[] }[];
    "very rare": { func: (...args: any[]) => any; args: any[] }[];
    rare: { func: (...args: any[]) => any; args: any[] }[];
    uncommon: { func: (...args: any[]) => any; args: any[] }[];
    common: { func: (...args: any[]) => any; args: any[] }[];
    [key: string]: any;
}

const coinAmount: { [key: string]: number[] } = {
    "common": [10, 20],
    "uncommon": [20, 35],
    "rare": [35, 75],
    "very rare": [75, 100]
}

const coinSubtractAmount: { [key: string]: number[] } = {
    "common": [-10, -5],
    "uncommon": [-15, -5],
    "rare": [-25, -10],
    "very rare": [-35, -15]
}

// Adapt to your desired loot tables - buffVal typically changes across rarity tiers and depends on buff target

const buffList: { [key: string]: Buff[] } = {
    "common": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ],
    "uncommon": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ],
    "rare": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ],
    "very rare": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ]
}

const debuffList: { [key: string]: Buff[] } = {
    "common": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ],
    "uncommon": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ],
    "rare": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ],
    "very rare": [
        { message: "MESSAGE TO PRINT", buffTarget: "TARGET BUFF CATEGORY", buffVal: 0 }
    ]
}

// inventory can be stored in a local JSON file or a DB

const itemDrops: { [key: string]: Item[] } = {
    "legendary": [
        { message: "MESSAGE TO PRINT", category: "CATEGORY OF ITEM DROP", qty: 1 }
    ]
}

// can change the occurences of each outcome type to influence the occurence rate of each type

const positiveOutcomes: Outcomes = {
    "legendary": [
        { func: addItem, args: ['legendary'] }
    ],
    "very rare": [
        { func: addCoins, args: [coinAmount['very rare']] },
        { func: addBuff, args: ['very rare'] },
    ],
    "rare": [
        { func: addCoins, args: [coinAmount['rare']] },
        { func: addBuff, args: ['rare'] },
    ],
    "uncommon": [
        { func: addCoins, args: [coinAmount['uncommon']] },
        { func: addBuff, args: ['uncommon'] },
    ],
    "common": [
        { func: addCoins, args: [coinAmount['common']] },
        { func: addBuff, args: ['common'] },
    ],
}

const neutralOutcomes: Outcomes = {
    "legendary": [
        { func: addItem, args: ["legendary"] }
    ],
    "very rare": [
        { func: getNeutralMessage, args: ["very rare"] }
    ],
    "rare": [
        { func: getNeutralMessage, args: ["rare"] }
    ],
    "uncommon": [
        { func: getNeutralMessage, args: ["uncommon"] }
    ],
    "common": [
        { func: getNeutralMessage, args: ["common"] }
    ]
}

const negativeOutcomes: Outcomes = {
    "legendary": [
        { func: addCoins, args: [coinSubtractAmount['very rare']] },
        { func: addDebuff, args: ['very rare'] },
    ],
    "very rare": [
        { func: addCoins, args: [coinSubtractAmount['very rare']] },
        { func: addDebuff, args: ['very rare'] },
    ],
    "rare": [
        { func: addCoins, args: [coinSubtractAmount['rare']] },
        { func: addDebuff, args: ['rare'] },
    ],
    "uncommon": [
        { func: addCoins, args: [coinSubtractAmount['uncommon']] },
        { func: addDebuff, args: ['uncommon'] },
    ],
    "common": [
        { func: addCoins, args: [coinSubtractAmount['common']] },
        { func: addDebuff, args: ['common'] },
    ],
}

export function getLootOutcome(player: Player, timeDuration: number) {
    const positiveChance = Math.ceil(POSITIVE_CHANCE_RANGE[0] +
        (((timeDuration - LootHistory.MIN_DURATION) / (LootHistory.MAX_DURATION - LootHistory.MIN_DURATION)) *
            (POSITIVE_CHANCE_RANGE[1] - POSITIVE_CHANCE_RANGE[0])));
    console.log(`negative chance reduction: ${player.nftBonuses.lootNegativeChanceReduction}`);
    let negativeChance = Math.ceil(positiveChance + NEGATIVE_CHANCE_FRACTION * (100 - positiveChance) * (100 - checkDoubling(player.nftBonuses.bonusDoubleChance, player.nftBonuses.
        lootNegativeChanceReduction)) / 100);
    console.log(`before temp buff: ${negativeChance}`);
    negativeChance = player.checkTempBuff("loot fail chance", negativeChance);
    console.log(positiveChance);
    console.log(`after temp buff: ${negativeChance}`);
    const outcomeChance = random.integer(1, 100);

    let outcomeType: "positive" | "neutral" | "negative" = "neutral";
    if (outcomeChance < positiveChance) {
        outcomeType = "positive";
    } else if (outcomeChance < negativeChance) {
        outcomeType = "negative";
    }

    console.log(`Outcome chance: ${outcomeChance}, positive chance: ${positiveChance}, negative chance: ${negativeChance} outcomeType: ${outcomeType}`);

    return _getLootOutcome(player, outcomeType, timeDuration);
}

function _getLootOutcome(player: Player, type: "positive" | "neutral" | "negative", lootDuration: number) {
    const outcomeChance = random.integer(1, 100);
    let rareModifier = checkDoubling(player.nftBonuses.bonusDoubleChance, player.nftBonuses.lootRareChanceAddition);
    rareModifier = player.checkTempBuff("loot rare chance", rareModifier);
    console.log(`rare chance modifier is: ${rareModifier}`);
    let outcomeCategory: string;
    if (type !== "positive") {
        lootDuration = 0;
    }

    let BASE_LEGENDARY_CHANCE = 100; // threshold to roll for legendary loot - adjust as needed

    // can have a reduced legendary chance for the host community - populate the environment variables accordingly

    if (!client.guilds.cache.get(process.env.DISCORD_SERVER_ID || "")?.members.cache.get(player.id)?.roles.cache.has(process.env.HOST_COMMUNITY_ROLE_ID || "")) {
        BASE_LEGENDARY_CHANCE -= 10; //adjust as needed
    }
    console.log(BASE_LEGENDARY_CHANCE);
    if (outcomeChance > BASE_LEGENDARY_CHANCE - rareModifier - lootDuration) {
        if (type === "negative") {
            outcomeCategory = "very rare";
        } else {
            outcomeCategory = "legendary";
            type = "positive"; // even neutral legendary rolls will get converted to +ve legendary
        }
        // change numbers below to adjust drop rates for different tiers
    } else if (outcomeChance > 0 - rareModifier - Math.floor(lootDuration / 2)) {
        outcomeCategory = "very rare";
    } else if (outcomeChance > 0 - rareModifier - lootDuration) {
        outcomeCategory = "rare";
    } else if (outcomeChance > 0 - rareModifier - lootDuration * 2) {
        outcomeCategory = "uncommon";
    } else {
        outcomeCategory = "common";
    }
    console.log(`Player ID: ${player.id} Player Name: ${player.name} Outcome chance: ${outcomeChance}, outcomeType: ${outcomeCategory}`);
    const outcomeType = type === "positive" ? positiveOutcomes : type === "neutral" ? neutralOutcomes : negativeOutcomes;
    var outcomeList: any = outcomeType[outcomeCategory];
    console.log(outcomeList);
    var outcome: { func: (player: Player, ...args: any[]) => any, args: any[] } = random.pick(outcomeList);
    var outcomeResult = outcome.func(player, outcome.args);
    // handle case when legendary was rolled after inventory was exhausted
    if (outcomeCategory === "legendary" && outcomeResult.message === "fail") {
        outcomeCategory = "very rare";
        outcomeList = outcomeType[outcomeCategory];
        outcome = random.pick(outcomeList);
        outcomeResult = outcome.func(player, outcome.args);
    }
    return {
        message: outcomeResult.message,
        result: type,
        rarity: outcomeCategory,
        coins: outcomeResult.coins,
        func: outcomeResult.func,
        args: outcomeResult.args
    };
}

// Implementing loot functions
export function addCoins(player: Player, coinArray: any[]): { message: string, coins: number } {
    console.log(`coins array: ${coinArray}`);
    let coins = random.integer(coinArray[0][0], coinArray[0][1]);
    if (coins > 0) {
        coins += checkDoubling(player.nftBonuses.bonusDoubleChance, player.nftBonuses.coinLootRewardAddition);
    }
    player.coins += coins;
    player.save();
    let message = "";
    if (coins > 0) {
        message = `You find a bag containing ${coins} coins amidst the fallen.`;
    } else {
        message = `While searching for loot, you are caught off-guard and get shaken down for ${Math.abs(coins)} coins.`;
    }
    return {
        message: message,
        coins: coins
    }
}

function addBuff(player: Player, rarity: string[]): { message: string, coins: number } {
    console.log(`Adding a buff of rarity: ${rarity[0]}`);
    const buff = random.pick(buffList[rarity[0]]);
    player.tempBuffs[buff.buffTarget] = buff.buffVal;
    player.save();
    return {
        message: buff.message.replace("{}", Math.abs(buff.buffVal).toString()),
        coins: 0
    }
}

function addDebuff(player: Player, rarity: string[]): { message: string, coins: number } {
    console.log(`Adding a buff of rarity: ${rarity[0]}`);
    const debuff = random.pick(debuffList[rarity[0]]);
    player.tempBuffs[debuff.buffTarget] = debuff.buffVal;
    player.save();
    return {
        message: debuff.message.replace("{}", Math.abs(debuff.buffVal).toString()),
        coins: 0
    }
}

function chooseItemDropWithCategory(category: string, rarity: string[]) {
    for (let option of itemDrops[rarity[0]]) {
        if (option['category'] === category) {
            return option;
        }
    }
}

function addItem(player: Player, rarity: string[]): { message: string, coins: number } {
    // exclude certain roles from getting legendary loot
    if (client.guilds.cache.get(process.env.DISCORD_SERVER_ID || "")?.members.cache.get(player.id)?.roles.cache.has(process.env.HOST_COMMUNITY_ROLE_ID || "")) {
        return {
            message: "fail",
            coins: 0
        }
    }
    console.log(`Adding an item of rarity: ${rarity[0]}`);
    const inventoryData = JSON.parse(readFileSync("./data/inventory.json").toString());
    let itemdrop = random.pick(itemDrops[rarity[0]]);
    if (!(inventoryData[itemdrop['category']]['supply'] > 0)) {
        for (let category of Object.keys(inventoryData)) {
            if (inventoryData[category]['supply'] > 0) {
                const alternate = chooseItemDropWithCategory(category, rarity);
                if (alternate) itemdrop = alternate;
            }
        }
    }
    if (inventoryData[itemdrop['category']]['supply'] > 0) {
        inventoryData[itemdrop['category']]['supply'] -= itemdrop['qty'];
        writeFileSync("./data/inventory.json", JSON.stringify(inventoryData, null, 2));
        return {
            message: itemdrop.message,
            coins: 0
        }
    } else {
        // no item left to give
        return {
            message: "fail",
            coins: 0
        }
    }
}

function getNeutralMessage(rarity: string[]): { message: string, coins: number } {
    switch (rarity[0]) {
        case "very rare":
            return { message: "You spot a creature you have never seen before and chase after it - but the search turns up no results in the end.", coins: 0 }
        case "rare":
            return { message: "Your looting frenzy ends in an anticlimactic manner as you barely manage to avoid an ambush.", coins: 0 }
        case "uncommon":
            return { message: "You try to find something useful but luck is not on your side.", coins: 0 }
        default:
            return { message: "You search for hours but find nothing of use. This time.", coins: 0 }
    }
}