import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.join(__dirname, "gameIds.json");
const filePath2 = path.join(__dirname, "nurturedGames.json");
const filePathFailed = path.join(__dirname, "")

// implement Postgres instead of writing into json file

dotenv.config({ path: path.resolve(__dirname, "../next-game/.env.local") });

async function getGames() {
  const response = await fetch("https://api.steampowered.com/ISteamApps/GetAppList/v2/")
  const result = await response.json();

  const write = fs.createWriteStream(filePath)

  write.write("[\n");
  result.applist.apps.forEach((game, index, arr) => {
    const line = "  " + JSON.stringify(game.appid);
    if (index < arr.length - 1) {
      write.write(line + ",\n");
    } else {
      write.write(line + "\n");
    }
  });
  write.write("]")
  write.end();
}

async function nurtureGames(data) {
  const link = "https://store.steampowered.com/api/appdetails?appids=";
  const stream = fs.createWriteStream(filePath2);

  stream.write("[\n");
  let written = 0;

  try {
    for (let i = 0; i < data.length; i++) {
      const appid = data[i];
      const key = String(appid);

      try {
        const res = await fetch(link + appid);
        if (!res.ok) {
          console.warn(`HTTP ${res.status} for appid ${appid}`);

          continue;
        }

        const body = await res.json();
        const entry = body?.[key];

        if (!entry || entry.success !== true) {
          continue;
        }

        const d = entry.data;
        if (!d || d.type !== "game") {
          continue;
        }

        const newGame = {
          id: d.steam_appid,
          name: d.name,
          type: d.type ?? "unknown",
          req_age: d.required_age ?? 0,
          categories: d.categories ?? [],
          genres: d.genres ?? [],
          screenshots: d.screenshots ?? []
        };


        if (written > 0) stream.write(",\n");
        stream.write("  " + JSON.stringify(newGame));
        written++;

        await sleep(1400);
      } catch (err) {
        console.warn(`Error at appid ${appid}:`, err?.message ?? err);
        continue;
      }
    }
  } finally {

    stream.write("\n]\n");
    stream.end();
  }
}

function sleep(m) {
  return new Promise(resolve => setTimeout(resolve, m))
}

async function getMyGames() {
  const STEAM_KEY = process.env.STEAM_API_KEY;
  const link = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_KEY}&steamid=76561197999968509&include_appinfo=true&include_played_free_games=true&include_free_sub=false&skip_unvetted_apps=true&language=en&include_extended_appinfo=true`

  const res = await fetch(link);
  const data = await res.json();

  const listOfKeys = new Map();

  data.response.games.forEach(game => {
    for (const [key, value] of Object.entries(game)) {
      listOfKeys.set(key, value);
    }
  })

  return listOfKeys;
}

getMyGames();