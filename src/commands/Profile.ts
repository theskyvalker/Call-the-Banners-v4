import { Command } from "@jiman24/commandment";
import { Message, MessageEmbed } from "discord.js";
import { Player } from "../structure/Player";
import { client } from "..";
import { decimalCheck, botCommandChannelFilter, MILLISECONDS_PER_HOUR } from "../utils";
import paginationEmbed from "@psibean/discord.js-pagination";
import { DateTime, Duration } from "luxon";

function getLootEndDateSeconds(start: Date, duration: number): number {
  return DateTime.fromJSDate(start).plus(Duration.fromMillis(duration * MILLISECONDS_PER_HOUR)).toSeconds();
}

export default class extends Command {
  name = "profile";
  description = "!profile show player's detailed profile. EX)!profile or !profile @User";

  async exec(msg: Message, _args: string[]) {
    botCommandChannelFilter(msg.channel.id);

    if (msg.mentions.repliedUser) {
      throw new Error("can't use this command as a reply");
    }

    const user = msg.mentions.members?.first()?.user || msg.author;
    const player = Player.fromUser(user);
    const thumbnail = user.avatarURL();

    //=====Get strike stats=====//
    const [role, coins, strikeHistory, strikes, parriedHistory, parried] = [
      player.role === "general" ? "General" : `Sword ${player.minAttack}`,
      player.coins,
      client.strikeHistory.allTime.filter((x) => x.playerID === player.id),
      client.strikeHistory.current.filter((x) => x.playerID === player.id),
      client.parryHistory.allTime.filter((x) => x.attackerID === player.id),
      client.parryHistory.current.filter((x) => x.attackerID === player.id)
    ];

    // Calculated value for battle stats
    const numberOfStrikesAllTime = strikeHistory.length;
    const lifeTimeGrossAttack = strikeHistory.reduce(
      (acc, x) => acc + x.damage,
      0
    );
    const averageDamage = lifeTimeGrossAttack / numberOfStrikesAllTime || 0;
    const totalDamageDealtInStage = strikes.reduce(
      (acc, x) => acc + x.damage,
      0
    );
    const avgDamageDealtInStage = totalDamageDealtInStage / strikes.length;

    //=====Get parry stats=====//

    let totalParryDamageLost = 0;
    let currentParryDamageLost = 0;

    if (parriedHistory.length) totalParryDamageLost = parriedHistory.reduce((acc, x) => acc + x.parryVal, 0);
    if (parried.length) currentParryDamageLost = parried.reduce((acc, x) => acc + x.parryVal, 0);

    const parries = client.parryHistory.current.filter((x) => x.defenderID === player.id);
    console.log(parries);
    const parriesSuccess = client.parryHistory.current.filter((x) => x.defenderID === player.id && x.success);

    const parryHistory = client.parryHistory.allTime.filter((x) => x.defenderID === player.id);
    console.log(parryHistory);
    const parryHistorySuccess = client.parryHistory.allTime.filter((x) => x.defenderID === player.id && x.success);

    let currentDamageBlocked = 0;

    if (parries.length) currentDamageBlocked = parries.reduce((acc, x) => acc + x.parryVal, 0);
    console.log(currentDamageBlocked);

    let totalDamageBlocked = 0;
    if (parryHistory.length) totalDamageBlocked = parryHistory.reduce((acc, x) => acc + x.parryVal, 0);
    console.log(totalDamageBlocked);

    //=====Get loot stats=====//
    const lootHistory = client.lootHistory.allTime.filter((x) => x.playerID === player.id);
    let sortedlootHistory = lootHistory.filter((x) => x.outcome != null);
    sortedlootHistory = sortedlootHistory.sort((a, b) => getLootEndDateSeconds(a.date, a.duration) - getLootEndDateSeconds(b.date, b.duration));
    console.log(sortedlootHistory);
    const positiveLootHistory = client.lootHistory.allTime.filter((x) => x.playerID === player.id && x.outcome?.result === "positive");
    const negativeLootHistory = client.lootHistory.allTime.filter((x) => x.playerID === player.id && x.outcome?.result === "negative");

    let totalDuration = 0;
    let coinsGained = 0;
    let coinsLost = 0;

    if (lootHistory.length) totalDuration = lootHistory.reduce((acc, x) => acc + x.duration, 0);
    if (positiveLootHistory.length) coinsGained = positiveLootHistory.reduce((acc, x) => (x.outcome && x.outcome.coins) ? acc + x.outcome.coins : acc, 0);
    if (negativeLootHistory.length) coinsLost = negativeLootHistory.reduce((acc, x) => (x.outcome && x.outcome.coins) ? acc + x.outcome.coins : acc, 0);
    const buffsGained = positiveLootHistory.filter((x) => x.outcome?.coins === 0);
    const buffsLost = negativeLootHistory.filter((x) => x.outcome?.coins === 0);

    const rarityCounts: { [index: string]: number } = {}

    for (let loot of lootHistory) {
      if (!loot.outcome) continue;
      if (loot.outcome.rarity in rarityCounts) {
        rarityCounts[loot.outcome.rarity] += 1;
      } else {
        rarityCounts[loot.outcome.rarity] = 0;
      }
    }

    //=====Get duel stats=====//
    const duelStartedHistory = client.duelHistory.allTime.filter((x) => x.challengerID === player.id);
    const betAmounts = [];
    for (let duel of duelStartedHistory) {
      betAmounts.push(duel.betAmount);
    }
    const challengedHistory = client.duelResultHistory.allTime.filter((x) => x.challengedID === player.id);
    const playerAcceptedDuelHistory = client.duelResultHistory.allTime.filter((x) => x.challengedID === player.id);
    const playerProposedDuelHistory = client.duelResultHistory.allTime.filter((x) => x.challengerID === player.id);

    const wonDuels = client.duelResultHistory.allTime.filter((x) => (x.challengedID === player.id || x.challengerID === player.id) && (x.winnerID && x.winnerID === player.id));
    const lostDuels = client.duelResultHistory.allTime.filter((x) => (x.challengedID === player.id || x.challengerID === player.id) && (x.winnerID && x.winnerID !== player.id));

    const wonCoins = [];
    const lostCoins = [];
    const wonDamage = [];
    const lostDamage = [];

    let maxWonDamage = 0;
    let maxLostDamage = 0;

    for (let duel of wonDuels) {
      (duel.winnings && duel.winnings > 0) ? wonCoins.push(duel.winnings) : wonCoins.push(duel.betAmount);
      if (duel.challengerID === player.id && duel.challengerDamage) {
        wonDamage.push(duel.challengerDamage);
        maxWonDamage = (maxWonDamage < duel.challengerDamage) ? duel.challengerDamage : maxWonDamage;
      } else if (duel.challengedID === player.id && duel.challengedDamage) {
        wonDamage.push(duel.challengedDamage);
        maxWonDamage = (maxWonDamage < duel.challengedDamage) ? duel.challengedDamage : maxWonDamage;
      }
    }

    for (let duel of lostDuels) {
      lostCoins.push(duel.betAmount);
      if (duel.challengerID === player.id && duel.challengerDamage) {
        lostDamage.push(duel.challengerDamage);
        maxLostDamage = (maxLostDamage < duel.challengerDamage) ? duel.challengerDamage : maxLostDamage;
      } else if (duel.challengedID === player.id && duel.challengedDamage) {
        lostDamage.push(duel.challengedDamage);
        maxLostDamage = (maxLostDamage < duel.challengedDamage) ? duel.challengedDamage : maxLostDamage;
      }
    }
    let totalDuelDamage = 0;

    if (wonDamage.length) totalDuelDamage = wonDamage.reduce((acc, x) => acc + x);
    if (lostDamage.length) totalDuelDamage += lostDamage.reduce((acc, x) => acc + x);

    //const duelsCoinWon = lostDuels.reduce((acc, x) => (x.winnings > 0) ? acc + x.winnings : acc + x.betAmount, 0);
    //const duelsCoinLost = lostDuels.reduce((acc, x) => acc + x.betAmount, 0);

    //const wonDuelDamageDealt = wonDuels.reduce((acc, x) => (x.challengerID === player.id) ? acc + x.challengerDamage : acc + x.challengedDamage, 0);
    //const lostDuelDamageDealt = lostDuels.reduce((acc, x) => (x.challengerID === player.id) ? acc + x.challengerDamage : acc + x.challengedDamage, 0);

    const outcomeCountsByRarity = `${rarityCounts["common"] ? `# of Common outcomes: ${rarityCounts["common"]}` : ""}
    ${rarityCounts["uncommon"] ? `# of Uncommon outcomes: ${rarityCounts["uncommon"]}` : ""}
    ${rarityCounts["rare"] ? `# of Rare outcomes: ${rarityCounts["rare"]}` : ""}
    ${rarityCounts["very rare"] ? `# of Very Rare outcomes: ${rarityCounts["very rare"]}` : ""}
    ${rarityCounts["epic"] ? `# of Epic outcomes: ${rarityCounts["epic"]}` : ""}`.trim();

    const strikesData = new MessageEmbed()
      .setColor("RANDOM")
      .setTitle(`Profile (${player.name})`)
      .setThumbnail(
        `${thumbnail ||
        "https://w7.pngwing.com/pngs/304/275/png-transparent-user-profile-computer-icons-profile-miscellaneous-logo-monochrome-thumbnail.png"
        }`
      )
      .setDescription(`Coins: ${coins}\nRank: ${role}`)
      .addFields([
        ...(strikes.length > 0
          ? [
            {
              name: "Strike Stats: Battle",
              value: `# of Strikes: ${strikes.length}
                Total HP Dealt: ${totalDamageDealtInStage}
                Average HP Dealt: ${decimalCheck(avgDamageDealtInStage, 2)}
                Damage Lost to Parries: ${currentParryDamageLost}`,
            },
          ]
          : []),
        ...(numberOfStrikesAllTime > 0
          ? [
            {
              name: "Strike Stats: Lifetime",
              value: `Lifetime Average: ${decimalCheck(averageDamage, 2)}
              # of Strikes Lifetime: ${numberOfStrikesAllTime}
              Damage Lost to Parries: ${totalParryDamageLost}
              ${player.battleCount ? "# of battles: " + player.battleCount : ""}`,
            },
          ]
          : [])]);

    const parryData = new MessageEmbed()
      .setColor("RANDOM")
      .setTitle(`Profile (${player.name})`)
      .setThumbnail(
        `${thumbnail ||
        "https://w7.pngwing.com/pngs/304/275/png-transparent-user-profile-computer-icons-profile-miscellaneous-logo-monochrome-thumbnail.png"
        }`
      )
      .setDescription(`Parry`)
      .addFields([
        ...(parries.length > 0
          ? [
            {
              name: "Parry Stats: Battle",
              value: `# of Parries: ${parries.length}
              # of Successful Parries: ${parriesSuccess.length}
              Total Damage Blocked: ${currentDamageBlocked}`
            },
          ]
          : []),
        ...(parryHistory.length > 0
          ? [
            {
              name: "Parry Stats: Lifetime",
              value: `# of Parries: ${parryHistory.length}
              # of Successful Parries: ${parryHistorySuccess.length}
              Total Damage Blocked: ${totalDamageBlocked}`
            },
          ]
          : [])]);

    const lootData = new MessageEmbed()
      .setColor("RANDOM")
      .setTitle(`Profile (${player.name})`)
      .setThumbnail(
        `${thumbnail ||
        "https://w7.pngwing.com/pngs/304/275/png-transparent-user-profile-computer-icons-profile-miscellaneous-logo-monochrome-thumbnail.png"
        }`
      )
      .setDescription(`Loot`)
      .addFields([
        ...(lootHistory.length > 0
          ? [
            {
              name: "Loot Stats",
              value: `# of Loot Attempts: ${lootHistory.length}
              # of Positive Outcomes: ${positiveLootHistory.length}
              # of Negative Outcomes: ${negativeLootHistory.length}
              # hours spent looting: ${totalDuration}

              Last Loot Result: ${sortedlootHistory[sortedlootHistory.length - 1].outcome?.message || sortedlootHistory[sortedlootHistory.length - 2].outcome?.message || ""}
              
              Coins Looted: ${coinsGained}
              Coins Lost: ${Math.abs(coinsLost)}
              Buffs Gained: ${buffsGained.length}
              Debuffs Suffered: ${buffsLost.length}

              ${outcomeCountsByRarity}
              `
            },
          ]
          : [])]);

    const duelsData = new MessageEmbed()
      .setColor("RANDOM")
      .setTitle(`Profile (${player.name})`)
      .setThumbnail(
        `${thumbnail ||
        "https://w7.pngwing.com/pngs/304/275/png-transparent-user-profile-computer-icons-profile-miscellaneous-logo-monochrome-thumbnail.png"
        }`
      )
      .setDescription(`Duel`)
      .addFields([
        ...(wonDuels.length + lostDuels.length > 0
          ? [
            {
              name: "Duel Stats",
              value: `# of Duels Fought: ${playerAcceptedDuelHistory.length + playerProposedDuelHistory.length}
              # of Duels Won: ${wonDuels.length} Lost: ${lostDuels.length} Draws: ${playerAcceptedDuelHistory.length + playerProposedDuelHistory.length - lostDuels.length - wonDuels.length}
              Coins won: ${(wonCoins.length) ? wonCoins.reduce((acc, x) => acc + x) : 0} Coins lost: ${(lostCoins.length) ? lostCoins.reduce((acc, x) => acc + x) : 0}
              Total Damage Dealt in Duels: ${totalDuelDamage}
              Avg Damage Dealt in Duels: ${(totalDuelDamage / (playerAcceptedDuelHistory.length + playerProposedDuelHistory.length)).toFixed(2)}

              # of Duels Started: ${duelStartedHistory.length}
              # of Duel Challenges Received: ${challengedHistory.length}
              # of Duels fought as the Challenger: ${playerAcceptedDuelHistory.length} 
              # of Duels fought as the Challenged: ${playerProposedDuelHistory.length}
              
              Max Coins bet on a duel: ${(betAmounts.length) ? betAmounts.reduce((acc, x) => (acc > x) ? acc : x, 0) : 0}
              Avg duel bet: ${(betAmounts.length) ? (betAmounts.reduce((acc, x) => acc + x) / betAmounts.length).toFixed(2) : 0}
              Max Coins won in a duel: ${(wonCoins.length) ? wonCoins.reduce((acc, x) => (acc > x) ? acc : x, 0) : 0}
              Max Damage Dealt in a won duel: ${maxWonDamage}
              Max Damage Dealt in a lost duel: ${maxLostDamage}
              Total Damage Dealt in won duels: ${(wonDamage.length) ? wonDamage.reduce((acc, x) => acc + x, 0) : 0}
              Total Damage Dealt in lost duels: ${(lostDamage.length) ? lostDamage.reduce((acc, x) => acc + x, 0) : 0}
              `
            },
          ]
          : [])]);
    const pagesData = [strikesData, duelsData, lootData, parryData];
    paginationEmbed(msg, pagesData);
  }
}
