import { RANK_INFORMATION } from "./ranks";

function calculateRank(data: any) {
  // if (data.username == "mistertfy64") {
  //   // hardcode
  //   return "Game Master";
  // } else
  // if (data.membership.isDeveloper) {
  //   return "Developer";
  // } else if (data.membership.isAdministrator) {
  //   return "Administrator";
  // } else if (data.membership.isModerator) {
  //   return "Moderator";
  // } else if (data.membership.isContributor) {
  //   return "Contributor";
  // } else if (data.membership.isTester) {
  //   return "Tester";
  // } else if (data.membership.isDonator) {
  //   return "Donator";
  // } else {
  //   // default rank
  //   return "";
  // }
  // let ranksOwned = Object.entries(data.membership).filter(
  //   ([key, value]) => value === true
  // );
  // console.debug(ranksOwned);
  // Object.keys(RANK_INFORMATION);
  let ranks = data.membership;
  let ranksOwned = [];
  let finalRank = "";
  let topPrecedence = 0;

  // for (let rank in ranks) {
  //   if (ranks[rank]) {
  //     ranksOwned.push(rank);
  //   }
  // }
  for (let rank in RANK_INFORMATION) {
    if (ranks[RANK_INFORMATION[rank].key]) {
      ranksOwned.push(rank);
    }
  }

  for (let rankOwned of ranksOwned) {
    if (RANK_INFORMATION[rankOwned].precedence > topPrecedence) {
      finalRank = rankOwned;
      topPrecedence = RANK_INFORMATION[rankOwned].precedence;
    }
  }
  return finalRank;
}

function getRankColor(rank: any) {
  if (rank == "Game Master") {
    return "#ff0000";
  } else if (rank == "Developer") {
    return "#ff0000";
  } else if (rank == "Administrator") {
    return "#ff0000";
  } else if (rank == "Moderator") {
    return "#ff6800";
  } else if (rank == "Contributor") {
    return "#4070ff";
  } else if (rank == "Tester") {
    return "#0194ff";
  } else if (rank == "Donator") {
    return "#00dd00";
  }
  return "#000000";
}

function getLevel(experiencePoints: number) {
  let currentLevel = 0;
  while (500 * Math.pow(currentLevel + 1, 0.75) <= experiencePoints) {
    experiencePoints -= 500 * Math.pow(currentLevel + 1, 0.75);
    currentLevel++;
  }
  return currentLevel;
}

function getProgressToNextLevel(experiencePoints: number) {
  let currentLevel = 0;
  while (500 * Math.pow(currentLevel + 1, 0.75) <= experiencePoints) {
    experiencePoints -= 500 * Math.pow(currentLevel + 1, 0.75);
    currentLevel++;
  }
  return experiencePoints / (500 * Math.pow(currentLevel + 1, 0.75));
}

export { getLevel, getProgressToNextLevel, calculateRank, getRankColor };
