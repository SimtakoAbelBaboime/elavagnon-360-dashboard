const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, AlignmentType, BorderStyle, LevelFormat, PageBreak, Header, Footer,
  PageNumber, NumberFormat, VerticalAlign
} = require("docx");
const fs = require("fs");

// ---------- palette ----------
const INK = "1C1B18";
const MUTED = "6B6558";
const ACCENT = "B7791F";   // or/amber
const ACCENT2 = "2F6F4E";  // vert
const ACCENT3 = "B23B32";  // corail
const ACCENT4 = "2B5D82";  // bleu ardoise
const LIGHT = "F3EFE4";
const BORDER = "DCD5C4";

const FONT = "Calibri";
const FONT_H = "Cambria";

function H1(text){
  return new Paragraph({
    text, heading: HeadingLevel.HEADING_1,
    spacing:{before:420, after:200},
    border:{ bottom:{ color:ACCENT, space:6, style:BorderStyle.SINGLE, size:10 } }
  });
}
function H2(text){
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing:{before:280, after:140} });
}
function H3(text){
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing:{before:200, after:100} });
}
function P(text, opts={}){
  return new Paragraph({
    spacing:{after:160, line:288},
    children:[ new TextRun({text, font:FONT, size:22, color:INK, bold:opts.bold||false, italics:opts.italics||false}) ],
    alignment: opts.align || AlignmentType.JUSTIFIED
  });
}
function Lead(text){
  return new Paragraph({
    spacing:{after:220},
    children:[ new TextRun({text, font:FONT, size:22, color:MUTED, italics:true}) ]
  });
}
function Bullet(text, opts={}){
  return new Paragraph({
    numbering:{ reference:"main-bullets", level: opts.level||0 },
    spacing:{after:90, line:276},
    children:[
      opts.strong ? new TextRun({text: opts.strong, bold:true, font:FONT, size:22, color:INK}) : new TextRun({text:"", size:1}),
      new TextRun({text: opts.strong? " — "+text : text, font:FONT, size:22, color:INK})
    ]
  });
}
function NumItem(text, opts={}){
  return new Paragraph({
    numbering:{ reference:"main-numbers", level:0 },
    spacing:{after:90, line:276},
    children:[ new TextRun({text, font:FONT, size:22, color:INK}) ]
  });
}
function KPI(label, value, color){
  return new TableCell({
    width:{size:25, type:WidthType.PERCENTAGE},
    shading:{ type:ShadingType.CLEAR, fill: LIGHT },
    margins:{top:140, bottom:140, left:140, right:140},
    children:[
      new Paragraph({children:[new TextRun({text:label.toUpperCase(), size:15, color:MUTED, font:FONT, bold:true})]}),
      new Paragraph({spacing:{before:60}, children:[new TextRun({text:value, size:32, color: color||ACCENT, font:FONT_H, bold:true})]})
    ]
  });
}
function cell(text, opts={}){
  return new TableCell({
    width: opts.width ? {size:opts.width, type:WidthType.DXA} : undefined,
    shading: opts.head ? {type:ShadingType.CLEAR, fill:INK} : (opts.fill? {type:ShadingType.CLEAR, fill:opts.fill} : undefined),
    verticalAlign: VerticalAlign.CENTER,
    margins:{top:90, bottom:90, left:110, right:110},
    children:[ new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children:[ new TextRun({text:String(text), bold:opts.head||opts.bold||false, color:opts.head?"FFFFFF":INK, size:opts.size||20, font:FONT}) ]
    })]
  });
}
function table(headers, rows, widths){
  const totalW = widths.reduce((a,b)=>a+b,0);
  return new Table({
    width:{size:totalW, type:WidthType.DXA},
    columnWidths: widths,
    borders:{
      top:{style:BorderStyle.SINGLE,size:4,color:BORDER}, bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER},
      left:{style:BorderStyle.SINGLE,size:4,color:BORDER}, right:{style:BorderStyle.SINGLE,size:4,color:BORDER},
      insideHorizontal:{style:BorderStyle.SINGLE,size:4,color:BORDER}, insideVertical:{style:BorderStyle.SINGLE,size:4,color:BORDER}
    },
    rows:[
      new TableRow({ tableHeader:true, children: headers.map((h,i)=>cell(h,{head:true, width:widths[i]})) }),
      ...rows.map(r => new TableRow({ children: r.map((v,i)=>cell(v,{width:widths[i]})) }))
    ]
  });
}
function calloutBox(title, text, color){
  return new Table({
    width:{size:9350, type:WidthType.PERCENTAGE==null?undefined:9350},
    columnWidths:[9350],
    borders:{ top:{style:BorderStyle.SINGLE,size:4,color:BORDER}, bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER},
      left:{style:BorderStyle.SINGLE,size:24,color:color}, right:{style:BorderStyle.SINGLE,size:4,color:BORDER},
      insideHorizontal:{style:BorderStyle.SINGLE,size:4,color:BORDER}, insideVertical:{style:BorderStyle.SINGLE,size:4,color:BORDER} },
    rows:[ new TableRow({ children:[ new TableCell({
      width:{size:9350, type:WidthType.DXA},
      shading:{type:ShadingType.CLEAR, fill:LIGHT},
      margins:{top:160,bottom:160,left:220,right:220},
      children:[
        new Paragraph({spacing:{after:70}, children:[new TextRun({text:title, bold:true, size:21, color, font:FONT})]}),
        new Paragraph({children:[new TextRun({text, size:21, color:INK, font:FONT})], alignment:AlignmentType.JUSTIFIED})
      ]
    })]})]
  });
}
function spacer(h=120){ return new Paragraph({spacing:{after:h}, children:[]}); }

// ============================================================
const doc = new Document({
  numbering:{
    config:[
      { reference:"main-bullets", levels:[
        { level:0, format:LevelFormat.BULLET, text:"—", alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:420, hanging:280}}} },
        { level:1, format:LevelFormat.BULLET, text:"·", alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:820, hanging:280}}} }
      ]},
      { reference:"main-numbers", levels:[
        { level:0, format:LevelFormat.DECIMAL, text:"%1.", alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:420, hanging:280}}} }
      ]}
    ]
  },
  sections:[{
    properties:{
      page:{ size:{width:11906, height:16838}, margin:{top:1000, bottom:1000, left:1100, right:1100} }
    },
    headers:{
      default: new Header({ children:[ new Paragraph({
        alignment:AlignmentType.RIGHT,
        children:[ new TextRun({text:"ELAVAGNON 360 — Rapport de solution", size:16, color:MUTED, font:FONT}) ]
      })]})
    },
    footers:{
      default: new Footer({ children:[ new Paragraph({
        alignment:AlignmentType.CENTER,
        children:[
          new TextRun({text:"Lomé Summer School en IA — ACAN × YAS Togo — Groupe 6  ·  ", size:16, color:MUTED, font:FONT}),
          new TextRun({text:"page ", size:16, color:MUTED, font:FONT}),
          new TextRun({children:[PageNumber.CURRENT], size:16, color:MUTED, font:FONT}),
        ]
      })]})
    },
    children:[

      // ---------------- COVER ----------------
      new Paragraph({spacing:{before:600, after:0}, children:[new TextRun({text:"HACKATHON — LOMÉ SUMMER SCHOOL EN IA", size:20, bold:true, color:ACCENT, font:FONT})]}),
      new Paragraph({spacing:{before:200, after:0}, children:[new TextRun({text:"ELAVAGNON 360", size:64, bold:true, color:INK, font:FONT_H})]}),
      new Paragraph({spacing:{before:60, after:400}, children:[new TextRun({text:"Pilotage client augmenté par l'intelligence artificielle", size:28, color:MUTED, italics:true, font:FONT})]}),
      new Paragraph({spacing:{after:60}, children:[new TextRun({text:"Rapport de solution", size:24, bold:true, color:ACCENT4, font:FONT})]}),
      new Paragraph({spacing:{after:500}, children:[new TextRun({text:"Comprendre, prédire et servir les clients d'une PME à partir de ses propres données", size:21, color:MUTED, font:FONT})]}),

      calloutBox("Cas témoin traité", "Entreprise ELAVAGNON — vente de produits et services destinés aux jeunes actifs togolais. Analyse de 200 profils clients, 500 commandes, 180 avis et 120 réclamations couvrant janvier 2025 à septembre 2026.", ACCENT4),
      spacer(500),
      new Paragraph({children:[new TextRun({text:"Équipe — Groupe 6", size:20, bold:true, color:INK, font:FONT})]}),
      new Paragraph({spacing:{after:20}, children:[new TextRun({text:"NANGA Ditorga · BANABESSE Altaf · Komi Osborn · GLEY Komlan Ferdinand · Simtako Abel Baboïme", size:20, color:MUTED, font:FONT})]}),
      new Paragraph({spacing:{before:300}, children:[new TextRun({text:"Septembre 2026", size:18, color:MUTED, font:FONT})]}),

      new Paragraph({children:[new PageBreak()]}),

      // ---------------- 1. CONTEXTE ----------------
      H1("1. Contexte et problématique"),
      P("ELAVAGNON vend des produits et services destinés aux jeunes actifs togolais, une clientèle exigeante dont la fidélité se gagne au fil de chaque interaction. L'entreprise dispose d'un historique de plusieurs années — commandes, avis, réclamations, canaux d'acquisition — mais cette donnée reste dormante : les décisions de mise en avant produit ou de campagne se prennent encore « au ressenti », faute d'un outil qui la rende lisible et actionnable."),
      P("La question à laquelle répond ce projet est simple à énoncer et difficile à résoudre pour une PME : comment transformer des données clients dispersées en informations simples et utiles, exploitables au quotidien par des équipes qui n'ont ni data scientist, ni temps à perdre en tableurs ?"),
      H2("1.1 Utilisateurs et besoins"),
      table(
        ["Utilisateur","Question à laquelle il doit pouvoir répondre en un coup d'œil"],
        [
          ["Dirigeant","Où en est le chiffre d'affaires ? Quels segments et quels risques doivent m'alerter ?"],
          ["Marketing","Quel produit pousser, pour qui, sur quel canal, avec quel message ?"],
          ["Commercial","Quels clients ont le plus fort potentiel de vente additionnelle ?"],
          ["Relation client","Quelles réclamations traiter en priorité ? Qui est sur le point de partir ?"],
        ],
        [2600, 6700]
      ),
      spacer(),
      H2("1.2 Contraintes du projet"),
      Bullet("fonctionner avec des données réalistes et accessibles à une PME (fichiers clients, ventes, avis, réclamations), sans infrastructure lourde", {strong:"Données accessibles"}),
      Bullet("présenter les résultats de façon compréhensible sans formation préalable, avec un langage métier plutôt que statistique", {strong:"Simplicité"}),
      Bullet("proposer des actions, pas seulement des constats — chaque écran doit répondre à « et maintenant, je fais quoi ? »", {strong:"Orientation décision"}),

      // ---------------- 2. DONNEES ----------------
      H1("2. Les données mobilisées"),
      P("Quatre jeux de données ont été fournis pour le cas ELAVAGNON et ont servi de socle à l'ensemble de l'analyse :"),
      table(
        ["Fichier","Contenu","Volume"],
        [
          ["clients.csv","Profil client : âge, sexe, ville, segment déclaré, canal d'acquisition, fréquence d'achat, satisfaction","200 clients"],
          ["achats.csv","Historique des commandes : produit, quantité, montant, date","500 commandes"],
          ["avis_clients.csv","Notes et commentaires libres laissés par les clients","180 avis"],
          ["reclamations.csv","Réclamations : motif, gravité, statut de résolution","120 réclamations"],
        ],
        [2400, 5800, 1900]
      ),
      spacer(),
      P("Ces quatre tables ont été rapprochées par identifiant client pour construire une vision « client à 360° » : un seul profil par client réunissant son comportement d'achat, son niveau de satisfaction, ses réclamations et le sentiment de ses avis. C'est cette vision unifiée qui alimente ensuite les trois agents IA décrits en partie 4."),
      H2("2.1 Qualité et limites des données"),
      P("Comme dans la plupart des PME, les données comportent des champs incomplets : sexe renseigné pour 163 clients sur 200, fréquence d'achat déclarée pour 154 clients, satisfaction pour 167 clients. La solution a été conçue pour fonctionner malgré ces trous — en calculant, quand c'est possible, des indicateurs de substitution à partir du comportement réel (ex. la satisfaction déduite de la note moyenne des avis quand elle n'est pas déclarée) plutôt que d'exclure les clients incomplets."),

      // ---------------- 3. ANALYSE ----------------
      H1("3. Ce que révèle l'analyse des données"),
      H2("3.1 Chiffres clés"),
      new Table({
        width:{size:9350, type:WidthType.DXA}, columnWidths:[2338,2338,2338,2336],
        borders:{top:{style:BorderStyle.NONE},bottom:{style:BorderStyle.NONE},left:{style:BorderStyle.NONE},right:{style:BorderStyle.NONE},insideHorizontal:{style:BorderStyle.NONE},insideVertical:{style:BorderStyle.NONE}},
        rows:[
          new TableRow({children:[ KPI("Chiffre d'affaires","31,9 M FCFA", ACCENT), KPI("Panier moyen","63 890 FCFA", ACCENT4), KPI("Clients actifs (90j)","38,5 %", ACCENT2), KPI("Satisfaction moyenne","2,9 / 5", ACCENT3) ]})
        ]
      }),
      spacer(200),
      P("Le taux de clients actifs sur les 90 derniers jours (38,5 %) est le signal le plus préoccupant : près de deux clients sur trois n'ont pas commandé récemment. Couplé à une satisfaction moyenne sous la barre des 3/5 et à un taux de réclamations non résolues de 75,8 %, il indique un risque de fuite silencieuse de la base client — exactement le phénomène que le score de risque de la partie 4.2 est conçu pour détecter en amont."),

      H2("3.2 Segmentation comportementale"),
      P("Au-delà du segment déclaratif (Premium / Régulier / Nouveau / Dormant), une segmentation comportementale a été recalculée à partir de la fréquence d'achat, de la récence, de la diversité du panier et de la satisfaction. Elle fait apparaître six profils :"),
      table(
        ["Segment","Clients","CA généré","Définition"],
        [
          ["Régulier","53","12,7 M FCFA","Achats réguliers, sans excès ni décrochage"],
          ["Explorateur à risque","50","4,95 M FCFA","Achat ancien (>180 j) et peu de commandes — sur le point de partir"],
          ["Dormant","39","7,5 M FCFA","Aucune activité depuis plus de 150 jours"],
          ["Acheteur opportuniste","26","2,2 M FCFA","Peu fréquent, réactif surtout aux promotions"],
          ["Prospect / jamais acheté","18","—","Fiché mais sans commande enregistrée"],
          ["Brand Lover","14","4,6 M FCFA","Fréquence et diversité élevées, satisfaction forte"],
        ],
        [2600, 1500, 1900, 3350]
      ),
      spacer(),
      P("Ce sont les 14 Brand Lovers qui portent la relation la plus rentable par client, mais ce sont les 50 « Explorateurs à risque » et 39 « Dormants » — soit 45 % de la base — qui pèsent le plus sur la croissance future si rien n'est fait. La priorité stratégique se déduit directement de ce tableau : retenir avant d'acquérir."),

      H2("3.3 Le signal des avis et réclamations (analyse NLP)"),
      P("Les 180 avis clients ont été classés automatiquement par sentiment : 119 positifs, 49 négatifs et 12 neutres. Les thèmes les plus fréquemment évoqués sont le service client (39 mentions), le prix (38) et la livraison (32) — trois irritants concrets et actionnables plutôt que de vagues insatisfactions."),
      P("Les 120 réclamations se répartissent en six motifs, en tête desquels le prix (25), les ruptures de stock (22) et la facturation (20). Leur gravité est élevée ou moyenne dans 70 % des cas, et 75,8 % restent non résolues — un stock de friction qui alimente directement le risque de départ des clients concernés."),

      H2("3.4 Performance des canaux d'acquisition"),
      table(
        ["Canal","Clients","Satisfaction moy.","CA moyen / client"],
        [
          ["WhatsApp","27","2,85 / 5","180 556 FCFA"],
          ["Référence (bouche-à-oreille)","42","3,00 / 5","179 643 FCFA"],
          ["Site web","33","2,60 / 5","164 091 FCFA"],
          ["Instagram","26","3,42 / 5","148 077 FCFA"],
          ["Boutique","34","2,56 / 5","156 765 FCFA"],
          ["Facebook","38","3,13 / 5","129 737 FCFA"],
        ],
        [3200, 1700, 2100, 2350]
      ),
      spacer(),
      P("Les clients acquis par référence et par WhatsApp dépensent le plus en moyenne : ce sont les canaux à privilégier pour les investissements d'acquisition. Instagram génère la satisfaction la plus élevée mais la valeur moyenne la plus faible — un canal d'image et de découverte plus que de vente directe. C'est ce type de lecture croisée, invisible dans un tableur brut, que le tableau de bord rend immédiate."),

      // ---------------- 4. SOLUTION ----------------
      H1("4. La solution : ELAVAGNON 360"),
      P("ELAVAGNON 360 est un tableau de bord unique, organisé par rôle métier, qui connecte les quatre sources de données et les fait travailler ensemble via trois agents IA. Ce n'est pas un outil de reporting de plus : chaque écran se termine par une action possible, pas seulement par un chiffre."),
      H2("4.1 Architecture générale"),
      Bullet("Les quatre fichiers sources sont rapprochés en un profil client unique (« vue 360° »).", {strong:"Couche données"}),
      Bullet("Segmentation comportementale, score de risque de churn, classification de sentiment, détection d'opportunités de vente croisée — décrits en partie 4.2.", {strong:"Couche analyse (agents IA)"}),
      Bullet("Cinq vues adaptées à chaque métier, plus un espace de dialogue libre avec l'IA.", {strong:"Couche restitution"}),
      spacer(80),
      H2("4.2 Les cinq espaces du tableau de bord"),
      table(
        ["Espace","Pour qui","Ce qu'on y trouve"],
        [
          ["Vue d'ensemble","Direction","CA, évolution mensuelle, répartition du risque de churn, poids de chaque segment — synthèse générée par l'IA sur demande"],
          ["Marketing","Équipe marketing","Produits stars par segment, performance des canaux, sentiment et thèmes des avis, générateur d'idées de newsletter"],
          ["Commercial","Équipe commerciale","Liste des opportunités de vente croisée chez les Brand Lovers, avec génération de message de vente personnalisé"],
          ["Relation client","Service client","Réclamations triées par urgence réelle, liste des clients à risque élevé avec plan d'action généré par l'IA"],
          ["Clients","Tous profils","Moteur de recherche et de filtre sur les 200 clients, fiche détaillée et recommandation individuelle"],
        ],
        [2000, 1800, 5550]
      ),

      H2("4.3 Les trois agents IA"),
      calloutBox("Agent NLP — lecture automatique du texte", "Catégorise chaque avis et chaque réclamation par sentiment (positif / neutre / négatif) et par thème (prix, livraison, qualité, service client), à partir de règles lexicales combinées à la note chiffrée. Il remplace une lecture manuelle impossible à l'échelle de centaines de messages et fait remonter les irritants réels plutôt que des impressions.", ACCENT4),
      spacer(160),
      calloutBox("Agent prédictif — score de risque de churn", "Calcule pour chaque client un score de 0 à 100 combinant la récence du dernier achat, le nombre de réclamations non résolues et le niveau de satisfaction. Un score élevé déclenche une alerte dans l'espace Relation client, avant que le client ne parte silencieusement — le scénario le plus coûteux pour une PME.", ACCENT3),
      spacer(160),
      calloutBox("Agent générateur — synthèses et recommandations", "Sur demande, rédige en langage naturel des synthèses exécutives, des idées de campagne, des messages de vente ou des plans d'action de rétention, en s'appuyant strictement sur les chiffres calculés par les deux agents précédents — jamais sur des données inventées.", ACCENT2),
      spacer(),
      P("Le score de risque de churn est volontairement transparent plutôt que « boîte noire » : il s'exprime avec une formule simple, ce qui permet à l'équipe relation client de comprendre — et donc de faire confiance à — chaque alerte qu'elle reçoit."),

      H2("4.4 Pourquoi l'IA est nécessaire ici (et pas seulement un tableur)"),
      P("Un tableur ou des statistiques simples auraient permis de calculer les KPI numériques de la partie 3.1. Ils échouent en revanche sur deux points où l'IA apporte une valeur réelle et non substituable pour une PME sans moyens humains supplémentaires :"),
      Bullet("180 avis et 120 réclamations en texte libre ne peuvent pas être lus et catégorisés manuellement chaque semaine sans mobiliser une personne à temps plein ; le traitement du langage naturel automatise cette lecture.", {strong:"Le volume de texte non structuré"}),
      Bullet("un score de risque calculé automatiquement détecte les clients qui décrochent avant que quelqu'un ne s'en aperçoive au hasard d'une réclamation — la différence entre agir et réagir.", {strong:"La détection précoce"}),

      // ---------------- 5. UTILISATION ----------------
      H1("5. Guide d'utilisation"),
      P("Le tableau de bord s'ouvre directement dans le navigateur, sans installation. La navigation se fait depuis le menu de gauche, organisé en deux groupes : le pilotage (par rôle métier) et les données brutes / l'IA."),
      H2("5.1 Prise en main en quatre étapes"),
      NumItem("Ouvrir l'espace correspondant à son rôle (Direction, Marketing, Commercial ou Relation client) depuis le menu de gauche."),
      NumItem("Lire les indicateurs clés affichés en haut de l'écran : ils donnent l'état de santé en un coup d'œil, sans calcul à faire."),
      NumItem("Filtrer ou sélectionner (segment, canal, client) pour affiner l'analyse à la situation qui intéresse l'utilisateur."),
      NumItem("Cliquer sur un bouton « Générer… » pour obtenir, en langage clair, une recommandation ou un message prêt à l'emploi, rédigé par l'agent IA à partir des données affichées à l'écran."),
      H2("5.2 Explorer un client précis"),
      P("Dans l'espace « Clients », la recherche par identifiant et les filtres par segment ou niveau de risque permettent de retrouver un client en quelques secondes. Un clic sur une ligne ouvre sa fiche complète (commandes, satisfaction, risque, dernier achat) et un bouton dédié génère une recommandation d'action personnalisée pour ce client précis."),
      H2("5.3 Poser une question libre à l'IA"),
      P("L'espace « Agents IA » propose un fil de discussion : on y pose une question en français courant (« quel segment devrait-on prioriser ce mois-ci ? ») et l'agent répond en s'appuyant sur les chiffres réels du tableau de bord, sans avoir besoin de naviguer dans les autres écrans."),
      calloutBox("Bon à savoir", "Toutes les réponses générées par l'IA sont ancrées dans les données chiffrées du tableau de bord et rappelées à chaque appel — elles ne remplacent pas un arbitrage humain sur une décision à fort enjeu (ex. rupture de contrat avec un client, campagne à budget important).", ACCENT),

      // ---------------- 6. IMPACT ----------------
      H1("6. Impact attendu, limites et perspectives"),
      H2("6.1 Bénéfices attendus"),
      Bullet("passer d'un choix de mise en avant produit « au ressenti » à un choix appuyé sur le comportement réel des 200 clients.", {strong:"Décisions marketing plus précises"}),
      Bullet("détecter les 51 clients actuellement en risque élevé avant leur départ effectif plutôt qu'après.", {strong:"Réduction de l'attrition"}),
      Bullet("14 opportunités de vente croisée déjà identifiées chez les seuls Brand Lovers, sans effort d'analyse supplémentaire.", {strong:"Revenus additionnels"}),
      Bullet("chaque rôle métier accède uniquement à ce dont il a besoin pour décider, dans un langage clair.", {strong:"Autonomie des équipes"}),
      H2("6.2 Limites actuelles"),
      Bullet("la classification de sentiment repose sur des règles lexicales simples ; un modèle de langage entraîné sur davantage de données clients togolaises affinerait la précision.", {strong:"NLP par mots-clés"}),
      Bullet("les jeux de données comportent des valeurs manquantes (sexe, fréquence déclarée, satisfaction) qui limitent ponctuellement la précision de certains croisements.", {strong:"Données incomplètes"}),
      Bullet("le score de risque de churn n'a pas encore été confronté à des départs réels constatés pour en calibrer précisément les seuils.", {strong:"Absence de historique de churn validé"}),
      H2("6.3 Prochaines étapes"),
      NumItem("Brancher le tableau de bord directement sur les outils existants d'ELAVAGNON (caisse, WhatsApp Business, réseaux sociaux) pour une mise à jour continue plutôt que ponctuelle."),
      NumItem("Suivre dans le temps la précision du score de churn en comparant les alertes aux départs réels, puis ajuster ses pondérations."),
      NumItem("Ajouter un canal d'envoi direct des messages générés (WhatsApp, e-mail) pour fermer la boucle entre recommandation et action."),
      NumItem("Étendre l'agent NLP à la détection automatique de nouveaux thèmes à mesure que le vocabulaire des clients évolue."),

      H1("7. Conclusion"),
      P("ELAVAGNON 360 répond directement à la question posée par l'entreprise : transformer des données clients dispersées en informations simples et utiles. La segmentation comportementale, le score de risque de churn et la lecture automatique des avis convertissent quatre fichiers bruts en un plan d'action lisible pour chaque équipe. L'intelligence artificielle y intervient là où elle apporte une valeur réelle — le traitement du texte non structuré et la génération de recommandations personnalisées — sans se substituer au jugement humain sur les décisions qui comptent."),
      P("Ce prototype, construit sur le cas témoin ELAVAGNON, est directement transposable à toute PME disposant d'un historique client comparable : c'est là tout l'enjeu de ce hackathon — rendre la donnée exploitable sans exiger de moyens que les petites structures n'ont pas."),
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/claude/analyse/ELAVAGNON_360_Rapport.docx", buf);
  console.log("OK", buf.length, "bytes");
});
