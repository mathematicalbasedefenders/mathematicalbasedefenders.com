const RANK_INFORMATION: any = {
  // "Game Master":
  //   "This user created and has full control over Mathematical Base Defenders.",
  // Administrator:
  //   "This user has almost full control over Mathematical Base Defenders.",
  // Moderator: "This user can assign punishments to users.",
  // Contributor:
  //   "This user helped with the development of Mathematical Base Defenders, but isn't part of the development team.",
  // Tester:
  //   "This user helped to test features of Mathematical Base Defenders, but isn't part of the development team.",
  // Donator: "This user has supported Mathematical Base Defenders financially."

  // Administration Roles

  "Developer": {
    name: "Developer",
    description:
      "This user created and has full control over Mathematical Base Defenders.",
    color: "#ff0000",
    key: "isDeveloper",
    precedence: 10000
  },

  "Administrator": {
    name: "Administrator",
    description:
      "This user created and has full control over Mathematical Base Defenders.",
    color: "#da1717",
    key: "isAdministrator",
    precedence: 9999
  },

  "Moderator": {
    name: "Moderator",
    description:
      "This user has punishment control over Mathematical Base Defenders.",
    color: "#ff7f00",
    key: "isModerator",
    precedence: 9998
  },

  // Helpful Roles

  "Collaborator": {
    name: "Collaborator",
    description:
      "This user has higher access to the Mathematical Base Defenders source code.",
    color: "#0e5bf8",
    key: "isCollaborator",
    precedence: 3002
  },

  "Trial Collaborator": {
    name: "Trial Collaborator",
    description:
      "This user has temporary higher access to the Mathematical Base Defenders source code.",
    color: "#2368fa",
    key: "isTrialCollaborator",
    precedence: 3001
  },

  "Contributor": {
    name: "Collaborator",
    description:
      "This user has helped Mathematical Base Defenders with its source code.",
    color: "#01acff",
    key: "isContributor",
    precedence: 3000
  },

  "Tester": {
    name: "Tester",
    description: "This user has helped test Mathematical Base Defenders.",
    color: "#5bb1e0",
    key: "isTester",
    precedence: 2000
  },

  // Money Roles

  "Donator": {
    name: "Donator",
    description:
      "This user has supported Mathematical Base Defenders financially.",
    color: "#2ec771",
    key: "isDonator",
    precedence: 1000
  }
};

export { RANK_INFORMATION };
