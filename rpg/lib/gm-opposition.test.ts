import assert from "node:assert/strict";

import { GM_OPPOSITION_ERROR, gmOppositionDrift } from "@/rpg/lib/gm-turn";

const isolate = "Aller à l'armoire des relais et isoler le segment mort du canal";

const stall =
  "Vous saisissez la clé à relais et vous dirigez vers l'armoire voisine, à quelques pas du banc de diagnostic. L'air recyclé semble plus lourd, chargé d'une odeur métallique inhabituelle. En ouvrant le panneau, les circuits apparaissent : le segment vers l'entrepôt est noir, coupé net. Une gaine adjacente montre des traces de frottement récentes, et un faible cliquetis irrégulier résonne depuis les profondeurs du conduit. Vous commencez à isoler le segment mort, mais la complexité du câblage et l'anomalie thermique rendent la manœuvre délicate.";

assert.equal(gmOppositionDrift(isolate, stall), GM_OPPOSITION_ERROR);
assert.equal(gmOppositionDrift(isolate, "Vous isolez le segment. L'air sent le métal."), null);
assert.equal(gmOppositionDrift(isolate, "mais l'armoire est coincée"), null);

assert.equal(gmOppositionDrift("Open the hatch", "but the hatch is stuck"), null);
assert.equal(
  gmOppositionDrift("Open the hatch", "but a thermal anomaly makes it difficult"),
  GM_OPPOSITION_ERROR,
);

const schematic =
  "Vous affichez le schéma complet du journal de bord. Les lignes du câblage se dessinent clairement : le segment mort du canal vers l'entrepôt est isolé dans l'armoire des relais voisine, à quelques pas du banc. Un détail attire cependant l'attention : une anomalie thermique mineure semble se propager le long d'une gaine adjacente.";
assert.equal(gmOppositionDrift("Afficher le schéma du journal de bord", schematic), GM_OPPOSITION_ERROR);

console.log("gm opposition checks passed");
