import { Command } from "@jiman24/commandment";
import { bold, random, sleep } from "@jiman24/discordjs-utils";
import { Message, GuildMember, User } from "discord.js";
import { client } from "..";
import { Player } from "../structure/Player";
import { botCommandChannelFilter, checkDoubling, MILLISECONDS_PER_MINUTE } from "../utils";
import { DateTime, Duration } from "luxon";
import { italic } from "@discordjs/builders";

interface RoundResult {
  draw: boolean,
  winner: Player | undefined,
  loser: Player,
  totalDamageA: number,
  totalDamageB: number,
  winnings: number
};

export default class extends Command {
  name = "duel";
  description = "!duel <player> <coins> [validity] challenge <player> to a duel (or accept an existing challenge by <player>) with a wager of <coins> coins, optionally adding a validity of [validity] minutes (min 1 to max 1440, default: 1440). EX) !duel <player> <coins>";

  DUEL_DELAY = 2500; // adjust delay (in milliseconds) between each message

  // can add different variations using the template for each round's messages in the below arrays

  round1Texts = [
    `<A> and <B> charge at each other and their blades exchange glancing blows. <A> sustains <DB> damage. <B> is also hurt for <DA> damage!`
  ];

  round2Texts = [
    `Exchanging tense stares, <A> and <B> go at it again. This time, <HIGHER_DAMAGE> gets the upper hand, dealing <HIGHER_DAMAGE_VAL> damage to <LOWER_DAMAGE> but they still do manage <LOWER_DAMAGE_VAL> damage against <HIGHER_DAMAGE>`
  ];

  round3Texts = [
    `Breathing heavily, both warriors make their final push against each other. Steel clashes with steel and when the dust settles, <winner> is the one left standing while <loser> manages to escape to fight another day with wounded flesh and pride.`
  ];

  duelEndTexts = [
    `<winner> wins the duel and the bag of <bet amount> coins!`
  ];

  private async resolveRound(msg: Message, playerA: Player, playerB: Player, roundTexts: string[], totalDamageA: number, totalDamageB: number, tempBonusA: number, tempBonusB: number, round: number): Promise<RoundResult> {
    // Choose a random round text from the array
    let roundText = random.pick(roundTexts);

    const playerABonus = (100 + checkDoubling(playerA.nftBonuses.bonusDoubleChance, playerA.nftBonuses.duelDamageAddition)) / 100;
    const playerBBonus = (100 + checkDoubling(playerB.nftBonuses.bonusDoubleChance, playerB.nftBonuses.duelDamageAddition)) / 100;

    console.log(`player A bonus: ${playerABonus} temp bonus: ${tempBonusA}`);
    console.log(`player B bonus: ${playerBBonus} temp bonus: ${tempBonusB}`);

    // Compute the damage dealt by each player
    let damageA = playerA.strike();
    let damageB = playerB.strike();

    if (round == 1) {
      damageA = rerollDamage(playerA, damageA);
      damageB = rerollDamage(playerB, damageB);
    }

    damageA = Math.floor(damageA * playerABonus * (100 + tempBonusA) / 100);
    damageB = Math.floor(damageB * playerBBonus * (100 + tempBonusB) / 100);

    console.log(`Round ${round} => ${playerA.name}: ${damageA} ${playerB.name}: ${damageB}`);

    // Determine who sustained more damage and who sustained less
    const [higherDamage, higherDamageVal] = damageA > damageB ? [playerA.name, damageA] : [playerB.name, damageB];
    const [lowerDamage, lowerDamageVal] = damageA > damageB ? [playerB.name, damageB] : [playerA.name, damageA];

    totalDamageA += damageA;
    totalDamageB += damageB;

    let winner, loser;
    let draw = false;

    winner = playerA;
    loser = playerB;

    if (totalDamageB > totalDamageA) {
      winner = playerB;
      loser = playerA;
    }

    if (totalDamageA == totalDamageB) {
      draw = true;
    }

    // Replace placeholders in the round 1 text with the actual values
    roundText = roundText
      .replace(/<A>/g, bold(playerA.name))
      .replace(/<B>/g, bold(playerB.name))
      .replace(/<DA>/g, damageA.toString())
      .replace(/<DB>/g, damageB.toString())
      .replace(/<HIGHER_DAMAGE>/g, bold(higherDamage))
      .replace(/<HIGHER_DAMAGE_VAL>/g, higherDamageVal.toString())
      .replace(/<LOWER_DAMAGE>/g, bold(lowerDamage))
      .replace(/<LOWER_DAMAGE_VAL>/g, lowerDamageVal.toString())
      .replace(/<winner>/g, bold(winner.name))
      .replace(/<loser>/g, bold(loser.name));

    msg.channel.send(roundText);

    await sleep(this.DUEL_DELAY);

    return {
      draw: draw,
      winner: winner,
      loser: loser,
      totalDamageA: totalDamageA,
      totalDamageB: totalDamageB,
      winnings: 0
    };
  }

  private async resolveDuel(msg: Message, playerA: Player, playerB: Player, betAmount: number): Promise<RoundResult> {

    let totalDamageA = 0;
    let totalDamageB = 0;

    const tempBonusA = playerA.tempBuffs["duel damage"];
    const tempBonusB = playerB.tempBuffs["duel damage"];

    playerA.resetTempBuffs("duel damage");
    playerA.save();

    playerB.resetTempBuffs("duel damage");
    playerB.save();

    let result = await this.resolveRound(msg, playerA, playerB, this.round1Texts, totalDamageA, totalDamageB, tempBonusA, tempBonusB, 1);

    result = await this.resolveRound(msg, playerA, playerB, this.round2Texts, result.totalDamageA, result.totalDamageB, tempBonusA, tempBonusB, 2);

    result = await this.resolveRound(msg, playerA, playerB, this.round3Texts, result.totalDamageA, result.totalDamageB, tempBonusA, tempBonusB, 3);

    msg.channel.send(`${bold(playerA.name)} Total Damage Dealt: ${result.totalDamageA}\t${bold(playerB.name)} Total Damage Dealt: ${result.totalDamageB}`)

    let winnings = 0;

    if (!result.winner || result.draw) {
      playerA.coins += betAmount;
      playerB.coins += betAmount;
      playerA.save();
      playerB.save();
      msg.channel.send(`You are both evenly matched to the T! No winner or loser this time. ${bold(betAmount)} coins have been returned to both of you.`);
      result.winner = undefined;
      result.winnings = 0;
      return result;
    } else if (result.winner.id == playerA.id) {
      winnings = Math.floor(betAmount * 2 * ((100 + checkDoubling(playerA.nftBonuses.bonusDoubleChance, playerA.nftBonuses.duelCoinAddition)) / 100));
      playerA.coins += winnings;
    } else {
      winnings = Math.floor(betAmount * 2 * ((100 + checkDoubling(playerB.nftBonuses.bonusDoubleChance, playerB.nftBonuses.duelCoinAddition)) / 100));
      playerB.coins += winnings;
    }

    playerA.save();
    playerB.save();

    const duelEndText = random.pick(this.duelEndTexts)
      .replace(/<winner>/g, `<@${result.winner.id}>`)
      .replace(/<bet amount>/g, winnings.toString());

    await msg.channel.send(duelEndText);

    result.winnings = winnings;

    return result;
  }

  async exec(msg: Message, args: string[]) {
    botCommandChannelFilter(msg.channel.id);
    const player = Player.fromUser(msg.author);

    /*if (client.battleStage.stage != "start") {
      throw new Error("you can only duel when the battle is ongoing");
    }*/

    //console.log(args);

    if (msg.mentions.repliedUser) {
      throw new Error(`!duel command cannot be used as a reply`);
    }

    let challenged = msg.mentions.members?.first();

    if (!challenged) {
      if (args[0] === 'anyone' || args[0] === 'any') {
        return addGlobalChallenge(player, msg, args[1], args[2] ? args[2] : undefined);
      } else {
        throw new Error(`you need to mention a player to challenge to a duel`);
      }
    }

    const challengedPlayer = Player.fromID(challenged.id);

    if (!challengedPlayer) {
      throw new Error(`challenged player is invalid`);
    } else if (challengedPlayer.id == player.id) {
      throw new Error(`of course, the only one who can ${italic(`truly`)} challenge you is yourself -- but you need to challenge others for the purposes of a duel`)
    }

    const amountStr = args[1];

    if (!amountStr) {
      throw new Error(`you need to give amount of coins to wager`);
    }

    const amount = parseInt(amountStr);

    if (Number.isNaN(amount) || amount <= 0) {
      throw new Error(`please give a valid non-negative integer amount of coins`);
    } else if (amount > player.coins) {
      throw new Error(`you don't have enough coins for the wager`);
    }

    var validDuel = client.duelHistory.getValidDuel(client, player, challengedPlayer, amount, DateTime.now());

    //console.log(validDuel);

    if (validDuel && validDuel.betAmount === amount) {

      //console.log(validDuel);
      //console.log(challenged);
      //console.log(msg.author.id);

      const acceptDate = DateTime.now();
      msg.channel.send(`You have accepted ${challenged}'s offer to duel for a wager of ${validDuel.betAmount} coins!`);

      player.coins -= amount;
      player.save();

      await sleep(this.DUEL_DELAY);

      const duelResult = await this.resolveDuel(msg, player, challengedPlayer, validDuel.betAmount);

      if (!validDuel.challengedID) {
        // the accepting player becomes the "challenged"
        validDuel.challengedID = player.id;
      }

      client.duelResultHistory.addDuelResult({
        challengerID: validDuel.challengerID,
        challengedID: validDuel.challengedID,
        startDate: validDuel.startDate,
        endDate: validDuel.endDate,
        validity: validDuel.validity,
        betAmount: validDuel.betAmount,
        winnerID: duelResult.winner?.id,
        acceptDate: acceptDate,
        winnings: duelResult.winnings,
        challengerDamage: duelResult.totalDamageA,
        challengedDamage: duelResult.totalDamageB
      });
      client.duelResultHistory.save();

      return;

    }

    if (amount > challengedPlayer.coins) {
      throw new Error(`the player you challenged does not have enough coins to match the wager`);
    }

    let timeduration = 60;

    if (args[2]) {
      const timedurationStr = args[2];
      timeduration = parseInt(timedurationStr); // overwrite default validity if one is not specified
      if (Number.isNaN(timeduration) || timeduration < 1 || timeduration > 1440) {
        throw new Error(`when providing a custom validity value, please give a valid integer time duration between 1 to 1440 minutes (24 hours)`);
      }
    }

    //check if player has enough coins or not
    if (player.coins < amount) {
      throw new Error("not enough coin to wager on the duel");
    }

    client.duelHistory.addDuel({
      challengerID: player.id,
      challengedID: challenged.id,
      startDate: DateTime.now(),
      endDate: DateTime.now().plus(Duration.fromMillis(timeduration * MILLISECONDS_PER_MINUTE)),
      validity: Duration.fromMillis(timeduration * MILLISECONDS_PER_MINUTE),
      betAmount: amount,
      global: false
    });

    player.coins -= amount;
    player.save();

    client.duelHistory.save();

    msg.channel.send(
      `${msg.author} has challenged ${challenged} to a duel with a wager of ${bold(amount)} coins`
    );

  }
}

function addGlobalChallenge(player: Player, msg: Message, betAmount: string, validity?: string) {
  if (!betAmount) {
    throw new Error(`you need to give amount of coins to wager`);
  }

  const amount = parseInt(betAmount);

  if (Number.isNaN(amount) || amount <= 0) {
    throw new Error(`please give a valid non-negative integer amount of coins`);
  } else if (amount > player.coins) {
    throw new Error(`you don't have enough coins for the wager`);
  }

  let timeduration = 60;

  if (validity) {
    timeduration = parseInt(validity); // overwrite default validity if one is not specified
    if (Number.isNaN(timeduration) || timeduration < 1 || timeduration > 1440) {
      throw new Error(`when providing a custom validity value, please give a valid integer time duration between 1 to 1440 minutes (24 hours)`);
    }
  }

  client.duelHistory.addDuel({
    challengerID: player.id,
    challengedID: undefined,
    startDate: DateTime.now(),
    endDate: DateTime.now().plus(Duration.fromMillis(timeduration * MILLISECONDS_PER_MINUTE)),
    validity: Duration.fromMillis(timeduration * MILLISECONDS_PER_MINUTE),
    betAmount: amount,
    global: true
  });

  player.coins -= amount;
  player.save();

  client.duelHistory.save();

  msg.channel.send(
    `${msg.author} has challenged ${bold("anyone valiant enough")} to a duel with a wager of ${bold(amount)} coins <@&${process.env.GLORY_SEEKER_ROLE_ID || ""}>`
  );

}

function rerollDamage(player: Player, damage: number): number {
  if (player.nftBonuses.duelRerollRound1Damage) {
    let roll2 = player.strike();
    return (roll2 > damage) ? roll2 : damage;
  } else {
    return damage;
  }
}