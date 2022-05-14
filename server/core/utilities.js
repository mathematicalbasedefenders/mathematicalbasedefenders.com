function calculateRank(data) {
    if (data.username == "mistertfy64") {
        // hardcode
        return "Game Master";
    } else if (data.membership.isDeveloper) {
        return "Developer";
    } else if (data.membership.isAdministrator) {
        return "Administrator";
    } else if (data.membership.isModerator) {
        return "Moderator";
    } else if (data.membership.isContributor) {
        return "Contributor";
    } else if (data.membership.isTester) {
        return "Tester";
    } else if (data.membership.isDonator) {
        return "Donator";
    } else {
        // default rank
        return "";
    }
}

function getRankColor(rank) {
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


function getLevel(experiencePoints) {
    let currentLevel = 0;
    while (500 * Math.pow(currentLevel + 1, 0.75) <= experiencePoints) {
        experiencePoints -= 500 * Math.pow(currentLevel + 1, 0.75);
        currentLevel++;
    }
    return currentLevel;
}

function getProgressToNextLevel(experiencePoints) {
    let currentLevel = 0;
    while (500 * Math.pow(currentLevel + 1, 0.75) <= experiencePoints) {
        experiencePoints -= 500 * Math.pow(currentLevel + 1, 0.75);
        currentLevel++;
    }
    return experiencePoints / (500 * Math.pow(currentLevel + 1, 0.75));
}

module.exports = {
    getLevel, getProgressToNextLevel, calculateRank, getRankColor
}
