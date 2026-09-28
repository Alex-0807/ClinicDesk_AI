import "dotenv/config";
import { runAgent } from "./agent/index";
(async () => {
  const r = await runAgent(process.argv[2], [], "eval-user", "Alex");
  console.log(JSON.stringify(r, null, 1).slice(0, 800));
  process.exit(0);
})();
