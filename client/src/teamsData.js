export const TEAMS = [
  {
    id: "CSK",
    name: "Chennai Super Kings",
    shortName: "CSK",
    primaryColor: "#FDB913",
    secondaryColor: "#005BAA",
    textColor: "#000000",
    gradient: "from-amber-400 to-yellow-500",
    border: "border-yellow-400",
    logoEmoji: "🦁",
    badgeText: "Whistle Podu"
  },
  {
    id: "DC",
    name: "Delhi Capitals",
    shortName: "DC",
    primaryColor: "#004C97",
    secondaryColor: "#EF1B23",
    textColor: "#FFFFFF",
    gradient: "from-blue-700 to-red-600",
    border: "border-blue-500",
    logoEmoji: "🦅",
    badgeText: "Roar Macha"
  },
  {
    id: "GT",
    name: "Gujarat Titans",
    shortName: "GT",
    primaryColor: "#1B2133",
    secondaryColor: "#DDB967",
    textColor: "#FFFFFF",
    gradient: "from-slate-900 to-amber-600",
    border: "border-amber-400",
    logoEmoji: "⚡",
    badgeText: "Aava De"
  },
  {
    id: "KKR",
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    primaryColor: "#3A225D",
    secondaryColor: "#D1AB3E",
    textColor: "#FFFFFF",
    gradient: "from-purple-900 to-amber-500",
    border: "border-purple-500",
    logoEmoji: "🟣",
    badgeText: "Korbo Lorbo Jeetbo"
  },
  {
    id: "LSG",
    name: "Lucknow Super Giants",
    shortName: "LSG",
    primaryColor: "#0057B8",
    secondaryColor: "#FF5E00",
    textColor: "#FFFFFF",
    gradient: "from-sky-600 to-orange-500",
    border: "border-sky-400",
    logoEmoji: "🚀",
    badgeText: "Ab Apni Baari Hai"
  },
  {
    id: "MI",
    name: "Mumbai Indians",
    shortName: "MI",
    primaryColor: "#004BA0",
    secondaryColor: "#D1AB3E",
    textColor: "#FFFFFF",
    gradient: "from-blue-600 to-indigo-800",
    border: "border-blue-400",
    logoEmoji: "💙",
    badgeText: "Duniya Hila Denge"
  },
  {
    id: "PBKS",
    name: "Punjab Kings",
    shortName: "PBKS",
    primaryColor: "#DD1F2D",
    secondaryColor: "#D8A74A",
    textColor: "#FFFFFF",
    gradient: "from-red-600 to-rose-700",
    border: "border-red-500",
    logoEmoji: "👑",
    badgeText: "Sadda Punjab"
  },
  {
    id: "RR",
    name: "Rajasthan Royals",
    shortName: "RR",
    primaryColor: "#EA1A85",
    secondaryColor: "#254AA5",
    textColor: "#FFFFFF",
    gradient: "from-pink-600 to-blue-700",
    border: "border-pink-500",
    logoEmoji: "🦚",
    badgeText: "Halla Bol"
  },
  {
    id: "RCB",
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    primaryColor: "#000000",
    secondaryColor: "#EC1C24",
    textColor: "#FFFFFF",
    gradient: "from-neutral-900 via-red-700 to-red-900",
    border: "border-red-600",
    logoEmoji: "🔴",
    badgeText: "Ee Sala Cup Namde"
  },
  {
    id: "SRH",
    name: "Sunrisers Hyderabad",
    shortName: "SRH",
    primaryColor: "#F26522",
    secondaryColor: "#000000",
    textColor: "#FFFFFF",
    gradient: "from-orange-600 to-amber-700",
    border: "border-orange-500",
    logoEmoji: "🔥",
    badgeText: "Orange Army"
  }
];

export const getTeam = (id) => TEAMS.find((t) => t.id === id) || {
  id: id || "UNK",
  name: id || "Unknown Team",
  shortName: id || "UNK",
  logoEmoji: "🏏",
  gradient: "from-slate-700 to-slate-900",
  primaryColor: "#64748b"
};
