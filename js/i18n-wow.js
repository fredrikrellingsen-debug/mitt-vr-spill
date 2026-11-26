// ============================================================================
// WORLD OF DUSTCRAFT (WoW-INSPIRERT COWBOY-VERDEN, KLASSER, RELIKVIER & CO-OP)
// ============================================================================
export const WOW_COWBOY_CLASSES = [
  {
    id: 'gunslinger',
    icon: '🤠',
    color: '#ffb84d',
    enName: 'Gunslinger (DPS)',
    noName: 'Revolvermann (DPS)',
    enRole: '+20% Weapon Dmg & +12% Crit • [G] Fan-the-Hammer Volley (12s CD)',
    noRole: '+20% Våpenskade & +12% Krit • [G] Seksløper-storm (12s nedkjøling)',
    enSkillName: 'Fan-the-Hammer',
    noSkillName: 'Seksløper-storm',
    cd: 12
  },
  {
    id: 'marshal',
    icon: '🛡',
    color: '#7cc4ff',
    enName: 'Frontier Marshal (Tank)',
    noName: 'Grenselands-Marshal (Tank)',
    enRole: '+40 Max HP & -25% Dmg Taken • [G] Iron Star Bulwark & Taunt (14s CD)',
    noRole: '+40 Maks HP & -25% Skade tatt • [G] Jernstjerne-skjold & Provoser (14s)',
    enSkillName: 'Iron Bulwark',
    noSkillName: 'Jernstjerne-skjold',
    cd: 14
  },
  {
    id: 'sawbones',
    icon: '🌿',
    color: '#6ef28d',
    enName: 'Sawbones Doc (Healer)',
    noName: 'Præriedoktor (Healer)',
    enRole: '+2.5 HP/s Aura • [G] Cactus Tonic Party Heal +65 HP & +25% Dmg (14s CD)',
    noRole: '+2,5 HP/s Aura • [G] Kaktus-eliksir Lag-heal +65 HP & +25% Skade (14s)',
    enSkillName: 'Tonic Wave',
    noSkillName: 'Eliksir-bølge',
    cd: 14
  },
  {
    id: 'beastmaster',
    icon: '🐺',
    color: '#c79bff',
    enName: 'Beastmaster Tracker (Hunter)',
    noName: 'Sporfinner & Dyretemmer (Jeger)',
    enRole: 'Free Warhound Rex (+65% Bite) & +12% Speed • [G] Pack Stampede (13s CD)',
    noRole: 'Gratis Jakthund «Rex» (+65% bitt) & +12% Fart • [G] Ulvestorm (13s)',
    enSkillName: 'Pack Stampede',
    noSkillName: 'Ulvestorm',
    cd: 13
  }
];

export const WOW_WESTERN_LOOT_TABLE = [
  // Uncommon (Green #1eff00)
  { id: 'red_sash_bandana', rarity: 'uncommon', color: '#1eff00', power: 12, dmgPct: 6, hpBonus: 0, goldPct: 0, critPct: 2, enName: 'Red Sash Outlaw Bandana', noName: 'Rødt Bandittsjerf' },
  { id: 'prospector_lantern', rarity: 'uncommon', color: '#1eff00', power: 14, dmgPct: 4, hpBonus: 10, goldPct: 8, critPct: 0, enName: "Prospector's Brass Lantern", noName: 'Gullgraverens Messinglykt' },
  { id: 'blanchy_oat_bag', rarity: 'uncommon', color: '#1eff00', power: 15, dmgPct: 0, hpBonus: 18, goldPct: 6, critPct: 0, enName: "Old Mustang's Feedbag", noName: 'Gamle-Mustangens Havresekk' },
  { id: 'wolf_fang_charm', rarity: 'uncommon', color: '#1eff00', power: 16, dmgPct: 5, hpBonus: 0, goldPct: 0, critPct: 5, enName: 'Whispering Wolf-Fang Charm', noName: 'Ulvetann-amulett' },
  // Rare (Blue #4da6ff)
  { id: 'ironjaw_spurs', rarity: 'rare', color: '#4da6ff', power: 28, dmgPct: 10, hpBonus: 15, goldPct: 5, critPct: 3, enName: "Captain Iron-Jaw's Silver Spurs", noName: 'Kaptein Jernkjeves Sølvsporer' },
  { id: 'boone_ivory_horn', rarity: 'rare', color: '#4da6ff', power: 30, dmgPct: 12, hpBonus: 10, goldPct: 0, critPct: 6, enName: "Boone's Big-Game Hunting Horn", noName: 'Boones Storvilt-jakthorn' },
  { id: 'cactus_moonshine', rarity: 'rare', color: '#4da6ff', power: 32, dmgPct: 8, hpBonus: 25, goldPct: 10, critPct: 0, enName: 'Mirage Cactus Elixir Flask', noName: 'Oasens Kaktus-eliksirflaske' },
  { id: 'solomon_rosary', rarity: 'rare', color: '#4da6ff', power: 34, dmgPct: 12, hpBonus: 20, goldPct: 0, critPct: 4, enName: "Preacher Solomon's Silver Cross", noName: 'Predikant Solomons Sølvkors' },
  // Epic (Purple #c66bff)
  { id: 'cortez_signet', rarity: 'epic', color: '#c66bff', power: 52, dmgPct: 18, hpBonus: 20, goldPct: 15, critPct: 5, enName: 'Warlord Signet of General Cortez', noName: 'General Cortez sin Krigsring' },
  { id: 'thunder_totem', rarity: 'epic', color: '#c66bff', power: 55, dmgPct: 15, hpBonus: 35, goldPct: 10, critPct: 8, enName: 'Spirit Totem of Thunder Plains', noName: 'Tordenslettens Åndetotem' },
  { id: 'caldera_heart', rarity: 'epic', color: '#c66bff', power: 58, dmgPct: 22, hpBonus: 28, goldPct: 0, critPct: 6, enName: 'Molten Heart of Diablo Caldera', noName: 'Det Glødende Kraterhjertet' },
  { id: 'astral_pocketwatch', rarity: 'epic', color: '#c66bff', power: 60, dmgPct: 20, hpBonus: 20, goldPct: 12, critPct: 10, enName: "Blackfeather's Astral Pocketwatch", noName: 'Blackfeathers Stjerne-lommeur' },
  // Legendary (Orange #ff9429)
  { id: 'thunderfury_cylinder', rarity: 'legendary', color: '#ff9429', power: 90, dmgPct: 30, hpBonus: 30, goldPct: 15, critPct: 12, enName: 'Thunderfury, Blessed Cylinder of the West', noName: 'Tordenstorm, Vestens Velsignede Tønne' },
  { id: 'sulfuras_anvil_brand', rarity: 'legendary', color: '#ff9429', power: 92, dmgPct: 28, hpBonus: 45, goldPct: 15, critPct: 10, enName: 'Sulfuras, Forged Brand of El Fuego', noName: 'Sulfuras, El Fuegos Ildstempel' },
  { id: 'malakor_blood_chalice', rarity: 'legendary', color: '#ff9429', power: 95, dmgPct: 26, hpBonus: 45, goldPct: 22, critPct: 10, enName: 'Crimson Chalice of Lord Malakor', noName: 'Lord Malakors Evige Blodkalk' },
  { id: 'high_marshal_star', rarity: 'legendary', color: '#ff9429', power: 100, dmgPct: 34, hpBonus: 40, goldPct: 25, critPct: 14, enName: 'Grand Marshal Star of Dustwood', noName: 'Stormarskalkens Gullstjerne' }
];

export const WOW_ZONE_NPCS = [
  {
    id: 'npc_maeve',
    x: 3.6,
    z: 8.2,
    yaw: -0.35,
    hatColor: 0xd8be94,
    coatColor: 0x3b4d6b,
    style: 'sheriff',
    enName: 'Deputy Maeve',
    noName: 'Visesheriff Maeve',
    enZone: 'Dustwood Town',
    noZone: 'Dustwood By',
    quests: [
      {
        id: 'mw_1', targetType: 'bottle', goal: 5, xp: 65, gold: 30, lootId: 'blanchy_oat_bag',
        enTitle: 'Quick-Draw Trial at Dustwood',
        noTitle: 'Seksløper-prøven i Dustwood',
        enLore: 'Every legend starts with a steady hand, stranger! Knock down the saloon practice bottles to prove your aim before riding into outlaw country.',
        noLore: 'Enhver legende starter med en stødig hånd, fremmed! Skyt ned øvingsflaskene ved Saloonen for å vise at du treffer blink før du rir ut i lovløst land.',
        enTask: 'Shoot 5 practice bottles in Dustwood',
        noTask: 'Skyt 5 øvingsflasker i Dustwood'
      },
      {
        id: 'mw_2', targetType: 'deer_any', goal: 3, xp: 85, gold: 40, food: 2,
        enTitle: 'Rations for Old Blanchy & the Posse',
        noTitle: 'Proviant til Gamle-Mustangen & Byen',
        enLore: 'Bandits raided our supply wagons on the south road, and the town pantry is bare. Ride north to Whispering Woods and bring back fresh venison.',
        noLore: 'Banditter plyndret forsyningsvognene våre i sør, og matboden i byen er skrapet. Ri nordover til Whispering Woods og skaff ferskt viltkjøtt.',
        enTask: 'Hunt 3 Deer in Whispering Woods ↑',
        noTask: 'Jakt 3 hjort i Whispering Woods ↑'
      },
      {
        id: 'mw_3', targetType: 'bandit_any', goal: 4, xp: 110, gold: 55, lootId: 'red_sash_bandana',
        enTitle: 'The Red Sash Brotherhood',
        noTitle: 'Brorskapet med Det Røde Sjerfet',
        enLore: 'Outlaws wearing crimson bandanas—calling themselves the Red Sash Brotherhood—have fortified Crimson Canyon! Thin their ranks, lawman.',
        noLore: 'Lovløse med røde bandittsjerf — «Røde Sjerf-brorskapet» — har forskanset seg i Crimson Canyon i øst! Tynn ut rekkene deres.',
        enTask: 'Defeat 4 Red Sash Outlaws in Crimson Canyon →',
        noTask: 'Bekjemp 4 Røde Sjerf-banditter i Crimson Canyon →'
      },
      {
        id: 'mw_4', targetType: 'mine_action', goal: 2, xp: 135, gold: 70, lootId: 'prospector_lantern',
        enTitle: 'You No Take Our Gold! (Mine Saboteurs)',
        noTitle: '«Du tar ikke gullet vårt!» (Gruvesjakten)',
        enLore: 'Crazed claim-jumpers holed up inside the Deep Gold Mine shouting "You no take our lantern—or our gold!" Clear the mine barricades or recover stolen ore.',
        noLore: 'Ville gullrøvere har barrikadert seg i den dype gullgruven og roper «Du tar ikke lykta eller gullet vårt!». Spreng barrikader eller sikre stjålet malm.',
        enTask: 'Clear barricades or recover gold in the Deep Mine →',
        noTask: 'Spreng barrikader eller sikre gull i Gullgruven →'
      },
      {
        id: 'mw_5', targetType: 'grizzly', goal: 1, xp: 155, gold: 85, pelts: 2,
        enTitle: 'WANTED: "Gnoll-Jaw" the River Grizzly',
        noTitle: 'ETTERSØKT: «Gnoll-kjeft» ved Elvebredden',
        enLore: 'Newcomers whisper in terror of a scarred monster grizzly stalking the river crossing north of town. Put an end to his reign!',
        noLore: 'Reisende hvisker i frykt om en arrete kjempegrizzly som vokter elvekrysset nord for byen. Gjør slutt på beistet!',
        enTask: 'Slay 1 Grizzly Bear north of the River Bridge ↑',
        noTask: 'Fell 1 grizzlybjørn nord for trebroen ↑'
      },
      {
        id: 'mw_6', targetType: 'train_sniper', goal: 4, xp: 175, gold: 95, lootId: 'ironjaw_spurs',
        enTitle: 'Ambush on the Southern Express',
        noTitle: 'Bakholdet ved Søndre Ekspresstog',
        enLore: 'Red Sash sharpshooters hijacked the armored steam train south of town! Sweep the railcars so stagecoaches can pass again.',
        noLore: 'Skarpskyttere fra Røde Sjerf-banden har kapret det pansrede damptoget i sør! Rens jernbanevognene.',
        enTask: 'Eliminate 4 Train Snipers at Southern Railway ↓',
        noTask: 'Uskadeliggjør 4 tog-skarpskyttere ved Damptoget ↓'
      },
      {
        id: 'mw_7', targetType: 'elite_foe', goal: 5, xp: 240, gold: 150, lootId: 'high_marshal_star',
        enTitle: 'Champion of Dustwood Valley',
        noTitle: 'Høymarskalkens Prøvelse i Dustwood',
        enLore: 'Word of your deeds has spread from Silverpine to Dead Man\'s Oasis. Strike down 5 elite threats across the frontier to earn the High Marshal\'s Star!',
        noLore: 'Ryktet om bragdene dine har nådd fra Silverpine til Dead Man\'s Oasis. Fell 5 elitefiender på tvers av grenselandet!',
        enTask: 'Defeat 5 Elite Foes or Bosses anywhere',
        noTask: 'Bekjemp 5 elitefiender eller bosser på kartet'
      }
    ]
  },
  {
    id: 'npc_boone',
    x: -3.4,
    z: -26.5,
    yaw: 0.25,
    hatColor: 0x6e4726,
    coatColor: 0x5c3d1e,
    style: 'tailor',
    enName: '"Buckshot" Boone',
    noName: 'Storviltjeger «Buckshot» Boone',
    enZone: 'Whispering Woods Safari',
    noZone: 'Whispering Woods Jaktleir',
    quests: [
      {
        id: 'bb_1', targetType: 'deer_any', goal: 4, xp: 80, gold: 45, pelts: 2,
        enTitle: 'Whispering Woods Safari: Stag Mastery',
        noTitle: 'Grenselands-safari: Hjortejakt Kap. I',
        enLore: 'Aha! Another keen-eyed tracker! I am writing "The Green Hills of Whispering Woods". Start by proving you can stalk four swift stags.',
        noLore: 'Aha! Enda en skarpsynt jeger! Jeg skriver boken «De Grønne Åsene i Whispering Woods». Start med å felle fire raske hjorter.',
        enTask: 'Hunt 4 Deer in Whispering Woods ↑',
        noTask: 'Fell 4 hjort i Whispering Woods ↑'
      },
      {
        id: 'bb_2', targetType: 'wolf', goal: 5, xp: 105, gold: 60, lootId: 'wolf_fang_charm',
        enTitle: 'Whispering Woods Safari: Wolf Mastery',
        noTitle: 'Grenselands-safari: Ulvejakt Kap. II',
        enLore: 'Timber wolves hunt in coordinated packs beneath the pines. Thin out five wolves before they encircle my camp!',
        noLore: 'Skogsulvene jakter i flokk under furutrærne. Fell fem ulver før de omringer jaktleiren min!',
        enTask: 'Hunt 5 Timber Wolves ↑',
        noTask: 'Fell 5 skogsulver ↑'
      },
      {
        id: 'bb_3', targetType: 'cougar', goal: 3, xp: 135, gold: 75, pelts: 2,
        enTitle: 'Stalkers of the High Crags: Cougar Mastery',
        noTitle: 'Fjellryggens Skygger: Pumajakt Kap. III',
        enLore: 'Up northwest toward Silverpine Peak prowl silent mountain cougars. Only a master hunter spots them before they pounce!',
        noLore: 'Høyt mot nordvest ved Silverpine Peak smyger lydløse fjellpumaer seg frem. Bare en ekte mesterjeger ser dem i tide!',
        enTask: 'Hunt 3 Mountain Cougars ↖',
        noTask: 'Jakt 3 fjellpumaer mot Silverpine Peak ↖'
      },
      {
        id: 'bb_4', targetType: 'bison', goal: 4, xp: 155, gold: 85, food: 3,
        enTitle: 'Thunder Hooves: Bison Mastery',
        noTitle: 'Tordnende Hover: Præriebison Kap. IV',
        enLore: 'Ride southwest to Thunder Plains where massive plains bison shake the earth. Bag four of those titans!',
        noLore: 'Ri sørvest til Thunder Plains der mektige præriebisoner får bakken til å riste. Fell fire av kjempene!',
        enTask: 'Hunt 4 Plains Bison SW ↙',
        noTask: 'Jakt 4 præriebison i sørvest ↙'
      },
      {
        id: 'bb_5', targetType: 'alpha_wolf', goal: 4, xp: 175, gold: 95, lootId: 'boone_ivory_horn',
        enTitle: 'Fangs of Frostfang: Alpha Direwolves',
        noTitle: 'Frostfangs Rovdyr: Alfa-ulver',
        enLore: 'Giant silver-furred Alpha Direwolves guard the northern ridges and Frostfang Mill. Claim four alpha pelts for my trophy lodge!',
        noLore: 'Kjempeulver med sølvgrå pels vokter nordryggen og Frostfang Sagbruk. Skaff fire alfa-skinn!',
        enTask: 'Slay 4 Alpha Direwolves in the North ↑/↖',
        noTask: 'Fell 4 alfa-ulver i nord ↑/↖'
      },
      {
        id: 'bb_6', targetType: 'white_stag', goal: 1, xp: 200, gold: 120, pelts: 3,
        enTitle: 'The Mythic White Stag of Silverpine',
        noTitle: 'Den Mytiske Hvite Kronhjorten',
        enLore: 'Legends speak of a radiant White Stag crowned with golden antlers atop Silverpine Peak. Track this living myth!',
        noLore: 'Gamle sagn forteller om en lysende Hvit Kronhjort med gullgevir på toppen av Silverpine Peak. Spor opp legenden!',
        enTask: 'Hunt the Legendary White Stag at Silverpine Peak ↖',
        noTask: 'Jakt Den Hvite Kronhjorten på Silverpine Peak ↖'
      },
      {
        id: 'bb_7', targetType: 'goliath', goal: 1, xp: 280, gold: 185, lootId: 'thunder_totem',
        enTitle: 'Apex Predator: Old Goliath of Frostfang',
        noTitle: 'Skogens Konge: Old Goliath ved Frostfang',
        enLore: 'My ultimate quarry! At Frostfang Timber Mill far north roams Old Goliath, an ancient scarred Kodiak the size of a stagecoach!',
        noLore: 'Mitt livs største trofé! Ved Frostfang Sagbruk langt i nord vandrer Old Goliath — en eldgammel kodiakbjørn stor som en diligense!',
        enTask: 'Defeat World Boss OLD GOLIATH at Frostfang Mill ↑',
        noTask: 'Beseir verdensbossen OLD GOLIATH ved Frostfang Sagbruk ↑'
      }
    ]
  },
  {
    id: 'npc_ezekiel',
    x: 61.5,
    z: 3.6,
    yaw: -1.45,
    hatColor: 0x8c683a,
    coatColor: 0x6e3b24,
    style: 'gunsmith',
    enName: 'Prospector Ezekiel',
    noName: 'Gullgraver Ezekiel',
    enZone: 'Crimson Canyon Outpost',
    noZone: 'Crimson Canyon Utpost',
    quests: [
      {
        id: 'ez_1', targetType: 'bandit_any', goal: 5, xp: 95, gold: 50,
        enTitle: 'Reclaiming Crimson Canyon',
        noTitle: 'Gjenerobringen av Crimson Canyon',
        enLore: 'Those Red Sash scoundrels chased my miners right out of the gulch! Clear five bandits from the canyon floor.',
        noLore: 'Røde Sjerf-kjeltringene jaget gruvearbeiderne mine rett ut av kløften! Rens fem banditter ut av canyonen.',
        enTask: 'Defeat 5 Canyon Outlaws →',
        noTask: 'Bekjemp 5 banditter i Crimson Canyon →'
      },
      {
        id: 'ez_2', targetType: 'gold_pickup', goal: 3, xp: 115, gold: 65, lootId: 'prospector_lantern',
        enTitle: 'Lost Nuggets of the Motherlode',
        noTitle: 'Tapte Gullklumper fra Hovedåren',
        enLore: 'Crates of raw gold nuggets were scattered across the canyon rocks when our mule cart overturned. Recover three gold stashes!',
        noLore: 'Kasser med rå gullklumper ble spredt langs klippene da muldyrvogna vår veltet. Finn tre gullskatter!',
        enTask: 'Collect 3 Gold Nugget/Chest stashes →',
        noTask: 'Samle 3 gullklumper/gullkister i øst →'
      },
      {
        id: 'ez_3', targetType: 'mine_action', goal: 3, xp: 140, gold: 80, dynamite: 2,
        enTitle: 'Deep Deadmines Demolition',
        noTitle: 'Sprengningsarbeid i Dypgruven',
        enLore: 'Foreman Slade sealed the richest shaft with heavy timber barricades. Use gunfire or dynamite to break right through!',
        noLore: 'Formann Slade stengte den rikeste sjakten med tunge tømmerbarrikader. Spreng deg vei gjennom gruven!',
        enTask: 'Clear 3 Mine Barricades / Mine Gold →',
        noTask: 'Spreng 3 gruvebarrikader / sikre gruvegull →'
      },
      {
        id: 'ez_4', targetType: 'strongbox', goal: 3, xp: 165, gold: 95,
        enTitle: 'Payroll of Fort Rattlesnake',
        noTitle: 'Lønningskassene i Fort Rattlesnake',
        enLore: 'General Cortez hoards our stolen bank strongboxes inside Fort Rattlesnake to the northeast. Steal them back!',
        noLore: 'General Cortez gjemmer de stjålne pengekassene våre inne i Fort Rattlesnake i nordøst. Hent dem tilbake!',
        enTask: 'Recover 3 Iron Strongboxes at Fort Rattlesnake ↗',
        noTask: 'Sikre 3 pengekasser i Fort Rattlesnake ↗'
      },
      {
        id: 'ez_5', targetType: 'moonstone', goal: 3, xp: 180, gold: 105,
        enTitle: 'Azure Moonstones of the Peaks',
        noTitle: 'Blå Månesteiner i Fjellene',
        enLore: 'Dwarven-grade luminous moonstones grow along Silverpine Peak. Touch three glowing crystals so I can forge arcane scopes!',
        noLore: 'Lysende blå månesteiner vokser langs klippene på Silverpine Peak. Samle tre krystaller til verkstedet mitt!',
        enTask: 'Collect 3 Glowing Moonstones NW ↖',
        noTask: 'Samle 3 glødende månesteiner i nordvest ↖'
      },
      {
        id: 'ez_6', targetType: 'horseshoe', goal: 2, xp: 205, gold: 120, lootId: 'ironjaw_spurs',
        enTitle: 'Relics of the Golden Mustang',
        noTitle: 'Relikviene etter Gull-Mustangen',
        enLore: 'Twenty-four solid gold horseshoes were forged by the first settlers. Track down two more across the frontier!',
        noLore: 'Tjuefire hestesko i rent gull ble smidd av de første nybyggerne. Finn to stykker ute i verden!',
        enTask: 'Find 2 Golden Horseshoes anywhere',
        noTask: 'Finn 2 gylne hestesko i verden'
      },
      {
        id: 'ez_7', targetType: 'treasure_any', goal: 6, xp: 250, gold: 165, lootId: 'cortez_signet',
        enTitle: 'Grand Treasure Baron of the West',
        noTitle: 'Grenselandets Store Skattemester',
        enLore: 'Collect six frontier treasures—gold chests, strongboxes, idols, or shards—and claim a royal outlaw signet!',
        noLore: 'Samle seks skatter eller relikvier på tvers av regionene for å motta et episk krigssegl!',
        enTask: 'Collect 6 Treasures or Relics anywhere',
        noTask: 'Samle 6 skatter eller relikvier på kartet'
      }
    ]
  },
  {
    id: 'npc_solomon',
    x: -59.5,
    z: -3.4,
    yaw: 1.45,
    hatColor: 0x221d1a,
    coatColor: 0x2b1b2e,
    style: 'sheriff',
    enName: 'Preacher Solomon',
    noName: 'Predikant Solomon',
    enZone: 'Boot Hill Vigil (Duskwood)',
    noZone: 'Boot Hill Nattevakt',
    quests: [
      {
        id: 'sk_1', targetType: 'night_any', goal: 4, xp: 105, gold: 55,
        enTitle: 'The Night Watch of Boot Hill',
        noTitle: 'Nattevakten ved Boot Hill',
        enLore: 'Darkness clings to Boot Hill like a shroud. Vampires and grave-stalkers rise among the headstones—send four back to the dust!',
        noLore: 'Mørket hviler tungt over Boot Hill kirkegård. Vampyrer og gravvandrere reiser seg mellom gravsteinene — send fire av dem tilbake i støvet!',
        enTask: 'Slay 4 Undead / Night Fiends ←',
        noTask: 'Beseir 4 vampyrer eller nattmonstre ←'
      },
      {
        id: 'sk_2', targetType: 'silver_relic', goal: 2, xp: 125, gold: 70, lootId: 'solomon_rosary',
        enTitle: 'Sacred Silver of the Fallen',
        noTitle: 'De Falnes Hellige Sølvrelikvier',
        enLore: 'Recover two blessed silver relics scattered among the tombstones before the vampire coven corrupts their light!',
        noLore: 'Finn to velsignede sølvrelikvier mellom gravsteinene før vampyrene slukker lyset i dem!',
        enTask: 'Recover 2 Glowing Silver Relics in Boot Hill ←',
        noTask: 'Samle 2 glødende sølvrelikvier på Boot Hill ←'
      },
      {
        id: 'sk_3', targetType: 'catacomb_guardian', goal: 3, xp: 155, gold: 85,
        enTitle: 'Horrors Beneath the Chapel',
        noTitle: 'Redsler i Den Sunkne Katakomben',
        enLore: 'Stone stairs inside Boot Hill Chapel lead down into an ancient crypt guarded by armored blood-knights. Purge three guardians!',
        noLore: 'Steintrappen inne i Boot Hill-kapellet fører ned til en eldgammel krypt voktet av pansrede blodvoktere. Rens tre voktere!',
        enTask: 'Slay 3 Catacomb Guardians below Boot Hill Chapel ←',
        noTask: 'Bekjemp 3 katakombevoktere under kapellet ←'
      },
      {
        id: 'sk_4', targetType: 'brimstone_foe', goal: 5, xp: 175, gold: 95,
        enTitle: 'Ashes of Brimstone Ghost Town',
        noTitle: 'Asken i Brimstone Spøkelsesby',
        enLore: 'Southeast lies Brimstone, a mining town swallowed by sulfur fire and undead revenants. Cleanse five Brimstone foes!',
        noLore: 'I sørøst ligger Brimstone — en gruveby slukt av svovelild og vandøde gjengangere. Bekjemp fem fiender i Brimstone!',
        enTask: 'Defeat 5 Raiders or Revenants in Brimstone ↘',
        noTask: 'Bekjemp 5 fiender i Brimstone Spøkelsesby ↘'
      },
      {
        id: 'sk_5', targetType: 'brimstone_totem', goal: 3, xp: 190, gold: 110,
        enTitle: 'Shatter the Cursed Totems',
        noTitle: 'Knus Svovel-totemene',
        enLore: 'Three burning totems anchor the curse over Brimstone Ghost Town. Shoot or blast all three into splinters!',
        noLore: 'Tre brennende totemer holder forbannelsen over Brimstone ved like. Skyt eller spreng alle tre i filler!',
        enTask: 'Destroy 3 Cursed Totems in Brimstone ↘',
        noTask: 'Ødelegg 3 forbannede totemer i Brimstone ↘'
      },
      {
        id: 'sk_6', targetType: 'marshal', goal: 1, xp: 225, gold: 140,
        enTitle: 'The Undead Lawman of Brimstone',
        noTitle: 'Den Vandøde Marshalen i Brimstone',
        enLore: 'Once my sworn brother-in-arms, the Brimstone Marshal now enforces a spectral tyranny. Grant his soul final peace!',
        noLore: 'Brimstone-Marshalen var en gang min våpenbror, men håndhever nå en forbannet lov. Gi sjelen hans hvile!',
        enTask: 'Defeat THE BRIMSTONE MARSHAL ↘',
        noTask: 'Beseir BRIMSTONE-MARSHALEN i sørøst ↘'
      },
      {
        id: 'sk_7', targetType: 'malakor', goal: 1, xp: 320, gold: 220, lootId: 'malakor_blood_chalice',
        enTitle: 'RAID: Lord Malakor, Vampire Overlord',
        noTitle: 'RAID-BOSS: Vampyrfyrsten Lord Malakor',
        enLore: 'Strike or shoot the Blood Chalice Altar inside Boot Hill Chapel (alone or with your Co-op Posse!) and vanquish Lord Malakor!',
        noLore: 'Skyt eller berør Blodalteret i Boot Hill-kapellet (alene eller sammen med venner i Co-op!) og beseir selveste Lord Malakor!',
        enTask: 'Summon & slay LORD MALAKOR at Boot Hill Chapel ←',
        noTask: 'Tilkall og beseir LORD MALAKOR ved Boot Hill ←'
      }
    ]
  },
  {
    id: 'npc_tallfeather',
    x: -119.5,
    z: 131.5,
    yaw: 0.85,
    hatColor: 0xc99c5e,
    coatColor: 0x6b4423,
    style: 'tailor',
    enName: 'Spirit-Tracker Tallfeather',
    noName: 'Åndesporer Tallfeather',
    enZone: 'Thunder Plains Circle',
    noZone: 'Thunder Plains Steinring',
    quests: [
      {
        id: 'tf_1', targetType: 'sun_rune', goal: 3, xp: 120, gold: 65,
        enTitle: 'Rites of the Ancient Sun Runes',
        noTitle: 'Solrunenes Hellige Rite',
        enLore: 'Welcome to Thunder Plains, walker. Three golden Sun Runes around the Stone Circle have dimmed—attune them to awaken the plains!',
        noLore: 'Velkommen til Tordensletten, vandrer. Tre gylne solruner rundt steinringen har falmet — berør dem for å vekke slettens kraft!',
        enTask: 'Attune 3 Ancient Sun Runes SW ↙',
        noTask: 'Aktiver 3 solruner ved Steinringen ↙'
      },
      {
        id: 'tf_2', targetType: 'wendigo', goal: 4, xp: 150, gold: 85,
        enTitle: 'Voices in the Wind: Wendigo Stalkers',
        noTitle: 'Stemmer i Vinden: Wendigo-vandrerne',
        enLore: 'Hungry Wendigo stalkers prowl the monoliths, corrupting the spirit trails. Drive four of them from the sacred stones!',
        noLore: 'Sultne Wendigo-monstre smyger seg rundt monolittene og forgifter åndestiene. Driv fire av dem bort!',
        enTask: 'Slay 4 Wendigo Stalkers SW ↙',
        noTask: 'Bekjemp 4 Wendigo-vandrere i sørvest ↙'
      },
      {
        id: 'tf_3', targetType: 'bison', goal: 4, xp: 165, gold: 90, food: 3,
        enTitle: 'Great Herd of the Plains',
        noTitle: 'Den Store Prærieflokken',
        enLore: 'Honor the old ways of the grassland: harvest four mighty bison to feed travellers crossing the southern wastes.',
        noLore: 'Hedre præriens gamle skikker: fell fire mektige bisoner slik at reisende over ødemarken får proviant.',
        enTask: 'Hunt 4 Plains Bison ↙',
        noTask: 'Jakt 4 præriebison på Thunder Plains ↙'
      },
      {
        id: 'tf_4', targetType: 'wild_beast', goal: 8, xp: 185, gold: 105, pelts: 3,
        enTitle: 'Trial of the Great Hunt',
        noTitle: 'Den Store Jaktprøven',
        enLore: 'Prove your bond with wind and rifle by hunting eight wild beasts across plains, woods, or peaks.',
        noLore: 'Vis ditt mesterskap på prærien og i skogen ved å felle åtte ville dyr.',
        enTask: 'Hunt 8 Wild Beasts anywhere',
        noTask: 'Jakt 8 ville dyr hvor som helst'
      },
      {
        id: 'tf_5', targetType: 'wendigo_boss', goal: 1, xp: 310, gold: 210, lootId: 'thunder_totem',
        enTitle: 'RAID: Wrath of the Ancient Wendigo',
        noTitle: 'RAID-BOSS: Ur-Wendigoens Vrede',
        enLore: 'Strike the glowing Emerald Obelisk in the center of the Stone Circle and defeat the towering Ancient Wendigo!',
        noLore: 'Skyt eller berør den grønne Obelisken midt i Steinringen og fell selveste Ur-Wendigoen!',
        enTask: 'Summon & slay THE ANCIENT WENDIGO ↙',
        noTask: 'Tilkall og beseir UR-WENDIGOEN ved Steinringen ↙'
      },
      {
        id: 'tf_6', targetType: 'horseshoe', goal: 2, xp: 210, gold: 120,
        enTitle: 'Footsteps of the Sky-Mustang',
        noTitle: 'Sporene etter Himmel-Mustangen',
        enLore: 'Seek out two Golden Horseshoes left behind where lightning kissed the frontier.',
        noLore: 'Finn to gylne hestesko som ligger skjult langs grenselandet.',
        enTask: 'Collect 2 Golden Horseshoes',
        noTask: 'Finn 2 gylne hestesko'
      },
      {
        id: 'tf_7', targetType: 'any_boss', goal: 2, xp: 290, gold: 195, lootId: 'thunderfury_cylinder',
        enTitle: 'Blessing of the Windseeker',
        noTitle: 'Vindvokterens Legendariske Velsignelse',
        enLore: 'Vanquish any two World Overlords across the frontier to receive Thunderfury, the storm-blessed revolver cylinder!',
        noLore: 'Beseir to valgfrie verdensbosser på kartet for å motta den legendariske Tordenstorm-tønnen!',
        enTask: 'Defeat any 2 World Bosses',
        noTask: 'Beseir 2 valgfrie verdensbosser'
      }
    ]
  },
  {
    id: 'npc_dusty',
    x: -10.5,
    z: 154.0,
    yaw: 2.8,
    hatColor: 0xc29b61,
    coatColor: 0x8a6940,
    style: 'gunsmith',
    enName: 'Explorer "Dusty" Jones',
    noName: 'Eventyrer «Dusty» Jones',
    enZone: "Dead Man's Oasis (Uldum)",
    noZone: "Dead Man's Oasis",
    quests: [
      {
        id: 'dj_1', targetType: 'oasis_idol', goal: 3, xp: 135, gold: 75, lootId: 'cactus_moonshine',
        enTitle: 'Golden Scarabs of the Sunken Temple',
        noTitle: 'Gullskarabéene i Det Sunkne Tempel',
        enLore: 'Snakes, curses, and sandstorms—it belongs in a museum! Grab three Golden Scarab Idols from the sandstone columns of Dead Man\'s Oasis!',
        noLore: 'Forbannelser og sandstormer — disse skattene hører hjemme på et museum! Hent tre Gullskarabé-idoler ved søylene i Dead Man\'s Oasis!',
        enTask: "Collect 3 Scarab Idols at Dead Man's Oasis ↓",
        noTask: "Samle 3 skarabé-idoler ved Dead Man's Oasis ↓"
      },
      {
        id: 'dj_2', targetType: 'oasis_foe', goal: 4, xp: 155, gold: 85,
        enTitle: 'Mirage Stalkers of the Palms',
        noTitle: 'Sandvandrerne under Palmene',
        enLore: 'Ancient sand-stalkers guard the oasis waters. Clear four of them so my expedition mules can drink!',
        noLore: 'Eldgamle sandvandrere vokter oasevannet. Bekjemp fire av dem slik at ekspedisjonen min kommer frem!',
        enTask: "Defeat 4 Oasis Stalkers at Dead Man's Oasis ↓",
        noTask: "Bekjemp 4 oase-fiender ved Dead Man's Oasis ↓"
      },
      {
        id: 'dj_3', targetType: 'sandwraith', goal: 1, xp: 280, gold: 185, lootId: 'cortez_signet',
        enTitle: 'RAID: Curse of the Sandwraith King',
        noTitle: 'RAID-BOSS: Sandkongens Forbannelse',
        enLore: 'The Pharaoh of the Dunes—the Sandwraith King—has awakened by the sunken arch! Put him back in his tomb!',
        noLore: 'Ørkenens hersker — Sandwraith King — har våknet ved tempelbuen! Beseir ham i en episk duell!',
        enTask: "Defeat SANDWRAITH KING at Dead Man's Oasis ↓",
        noTask: "Beseir SANDWRAITH KING ved Dead Man's Oasis ↓"
      },
      {
        id: 'dj_4', targetType: 'treasure_any', goal: 5, xp: 185, gold: 110,
        enTitle: 'Expedition Across Shifting Sands',
        noTitle: 'Ekspedisjon gjennom Ørkensanden',
        enLore: 'A true relic hunter leaves no stone unturned. Recover five treasures or ancient artifacts!',
        noLore: 'En ekte skattejeger lar ingen ruiner stå uutforsket. Finn fem skatter eller relikvier!',
        enTask: 'Recover 5 Treasures or Relics',
        noTask: 'Samle 5 skatter eller relikvier'
      },
      {
        id: 'dj_5', targetType: 'combat_any', goal: 12, xp: 195, gold: 115,
        enTitle: 'Raiders of the Southern Wastes',
        noTitle: 'Ødemarkens Lovløse & Monstre',
        enLore: 'Clear the southern trade routes of twelve hostile outlaws or night creatures.',
        noLore: 'Rens karavaneveiene for tolv fiendtlige banditter eller monstre.',
        enTask: 'Defeat 12 Hostile Enemies',
        noTask: 'Bekjemp 12 fiender'
      },
      {
        id: 'dj_6', targetType: 'oasis_idol', goal: 3, xp: 210, gold: 130,
        enTitle: 'Second Vault of the Mirage',
        noTitle: 'Det Andre Skattekammeret',
        enLore: 'The desert wind uncovered three more Golden Scarabs around the oasis pool—claim them quickly!',
        noLore: 'Ørkenvinden har avdekket tre nye Gullskarabéer ved oasevannet — sikre dem raskt!',
        enTask: 'Collect 3 Scarab Idols ↓',
        noTask: 'Samle 3 skarabé-idoler ↓'
      },
      {
        id: 'dj_7', targetType: 'sandwraith', goal: 1, xp: 310, gold: 210, lootId: 'malakor_blood_chalice',
        enTitle: 'Heroic Tomb of the Sandwraith',
        noTitle: 'Heroisk Oppgjør i Oasetempelet',
        enLore: 'The Sandwraith King rises once more beneath the desert sun. Defeat him again for a mythic desert relic!',
        noLore: 'Sandwraith King har gjenoppstått ved tempelet. Beseir ham igjen for en legendarisk belønning!',
        enTask: 'Defeat SANDWRAITH KING ↓',
        noTask: 'Beseir SANDWRAITH KING ↓'
      }
    ]
  },
  {
    id: 'npc_mcgraw',
    x: 157.5,
    z: 58.0,
    yaw: -1.6,
    hatColor: 0x2b2420,
    coatColor: 0x4a1d14,
    style: 'gunsmith',
    enName: 'Master Smith Ironhand',
    noName: 'Mester-smed Jernhånd',
    enZone: 'Diablo Caldera (Molten Forge)',
    noZone: 'Diablo Caldera Esse',
    quests: [
      {
        id: 'im_1', targetType: 'hellhound', goal: 4, xp: 150, gold: 85,
        enTitle: 'Core Hounds of Diablo Caldera',
        noTitle: 'Helveteshundene i Diablo Caldera',
        enLore: 'Fire-breathing Caldera Hellhounds prowl the lava fissures! Slay four of those volcanic beasts so I can stoke the Obsidian Forge!',
        noLore: 'Ildsprutende helveteshunder vokter lavakløftene! Fell fire av vulkanbeistene så jeg kommer til ved Obsidian-ambolten!',
        enTask: 'Slay 4 Caldera Hellhounds ↘',
        noTask: 'Bekjemp 4 helveteshunder ved Diablo Caldera ↘'
      },
      {
        id: 'im_2', targetType: 'meteor_core', goal: 3, xp: 165, gold: 95,
        enTitle: 'Dark Meteoric Iron for the Anvil',
        noTitle: 'Meteorisk Svartjern til Ambolten',
        enLore: 'Only glowing Meteoric Iron Cores from the lava rim can temper legendary barrels. Bring me three cores!',
        noLore: 'Kun glødende meteorittkjerner fra lavakanten kan herde legendarisk våpenstål. Hent tre kjerner til meg!',
        enTask: 'Collect 3 Meteoric Iron Cores at Diablo Caldera ↘',
        noTask: 'Samle 3 meteorittkjerner ved Diablo Caldera ↘'
      },
      {
        id: 'im_3', targetType: 'caldera_foe', goal: 6, xp: 185, gold: 110, lootId: 'caldera_heart',
        enTitle: 'Purge of the Obsidian Rim',
        noTitle: 'Renselsen av Lavakanten',
        enLore: 'Flame-cult raiders and hellhounds swarm the forge. Drive back six Caldera foes!',
        noLore: 'Krater-plyndrere og helveteshunder svermer rundt smia. Bekjemp seks fiender i Diablo Caldera!',
        enTask: 'Defeat 6 Caldera Raiders or Hellhounds ↘',
        noTask: 'Bekjemp 6 fiender i Diablo Caldera ↘'
      },
      {
        id: 'im_4', targetType: 'el_fuego', goal: 1, xp: 320, gold: 215, lootId: 'sulfuras_anvil_brand',
        enTitle: 'RAID: "By Fire Be Purged!" — El Fuego',
        noTitle: 'RAID-BOSS: «Ved Ilden skal du renses!» — El Fuego',
        enLore: 'The Obsidian Juggernaut EL FUEGO stands by the molten pool roaring "TOO SOON, LAWMAN!" Strike him down and claim Sulfuras\'s Brand!',
        noLore: 'Vulkan-kjempen EL FUEGO vokter lavapølen! Samle motet (eller ta med venner i Co-op) og fell ham for å vinne legendariske Sulfuras!',
        enTask: 'Defeat World Boss EL FUEGO at Diablo Caldera ↘',
        noTask: 'Beseir verdensbossen EL FUEGO ved Diablo Caldera ↘'
      },
      {
        id: 'im_5', targetType: 'elite_foe', goal: 6, xp: 215, gold: 130, dynamite: 3,
        enTitle: 'Tempered in Gunpowder & Magma',
        noTitle: 'Herdet i Krutt og Magma',
        enLore: 'Test our volcanic steel against six elite enemies anywhere on the frontier!',
        noLore: 'Test det vulkanske stålet vårt mot seks elitefiender på grenselandet!',
        enTask: 'Defeat 6 Elite Foes or Bosses',
        noTask: 'Bekjemp 6 elitefiender eller bosser'
      },
      {
        id: 'im_6', targetType: 'meteor_core', goal: 3, xp: 220, gold: 135,
        enTitle: 'Reforging the Masterwork',
        noTitle: 'Ny Støping ved Obsidian-essen',
        enLore: 'Gather three fresh Meteoric Iron Cores for the guild armory!',
        noLore: 'Hent tre nye meteorittkjerner til mestersmia!',
        enTask: 'Collect 3 Meteoric Iron Cores ↘',
        noTask: 'Samle 3 meteorittkjerner ↘'
      },
      {
        id: 'im_7', targetType: 'el_fuego', goal: 1, xp: 340, gold: 240, lootId: 'thunderfury_cylinder',
        enTitle: 'Heroic Molten Showdown: El Fuego',
        noTitle: 'Heroisk Oppgjør: El Fuego',
        enLore: 'El Fuego has risen from the magma fissure stronger than before. Vanquish the Firelord of the West!',
        noLore: 'El Fuego har reist seg fra magmaen på nytt. Fell Ildherren i Vesten!',
        enTask: 'Defeat EL FUEGO ↘',
        noTask: 'Beseir EL FUEGO ↘'
      }
    ]
  },
  {
    id: 'npc_sadie',
    x: 136.0,
    z: -113.5,
    yaw: 0.35,
    hatColor: 0x3b2c20,
    coatColor: 0x5e1924,
    style: 'sheriff',
    enName: 'Ranger-Marshal Sadie',
    noName: 'Grensemarsjall Sadie',
    enZone: 'Northern Frontier & Roost',
    noZone: 'Nordfronten & Fortet',
    quests: [
      {
        id: 'sa_1', targetType: 'fort_bandit', goal: 5, xp: 145, gold: 80,
        enTitle: 'Storming Fort Rattlesnake',
        noTitle: 'Stormingen av Fort Rattlesnake',
        enLore: 'General Cortez\'s desperados hold the palisade walls right ahead of us. Breach the fort and take down five Fort Desperados!',
        noLore: 'Desperadoene til General Cortez holder tømmermurene rett foran oss. Storm fortet og bekjemp fem fort-desperadoer!',
        enTask: 'Defeat 5 Fort Desperados ↗',
        noTask: 'Bekjemp 5 desperadoer i Fort Rattlesnake ↗'
      },
      {
        id: 'sa_2', targetType: 'cortez', goal: 1, xp: 270, gold: 175, lootId: 'cortez_signet',
        enTitle: 'RAID: Downfall of General Cortez',
        noTitle: 'RAID-BOSS: General Cortez sitt Fall',
        enLore: 'Challenge Warlord General Cortez inside the fort courtyard and break his iron grip on the northeast!',
        noLore: 'Utfordre krigsherren General Cortez inne på borggården og bryt grepet hans om nordøst!',
        enTask: 'Defeat World Boss GENERAL CORTEZ ↗',
        noTask: 'Beseir verdensbossen GENERAL CORTEZ ↗'
      },
      {
        id: 'sa_3', targetType: 'mill_crate', goal: 3, xp: 165, gold: 95, food: 2,
        enTitle: 'Supply Line at Frostfang Mill',
        noTitle: 'Forsyningslinjen ved Frostfang Sagbruk',
        enLore: 'Ride north to Frostfang Timber Mill and secure three Redwood Supply Crates before wolves tear them open.',
        noLore: 'Ri nord til Frostfang Sagbruk og sikre tre tømmerkasser før ulvene river dem opp.',
        enTask: 'Collect 3 Redwood Crates at Frostfang Mill ↑',
        noTask: 'Samle 3 tømmerkasser ved Frostfang Sagbruk ↑'
      },
      {
        id: 'sa_4', targetType: 'star_shard', goal: 3, xp: 185, gold: 110,
        enTitle: "Astral Anomalies of Raven's Roost",
        noTitle: "Stjerneskårene ved Raven's Roost",
        enLore: 'Far west-northwest stands Raven\'s Roost Observatory, where brass rings spin around fallen Starlight Shards. Collect three shards!',
        noLore: 'Langt i vest-nordvest ruver Raven\'s Roost Observatorium der messingringer spinner rundt falne stjerneskår. Samle tre skår!',
        enTask: "Collect 3 Starlight Shards at Raven's Roost ↖",
        noTask: "Samle 3 stjerneskår ved Raven's Roost ↖"
      },
      {
        id: 'sa_5', targetType: 'observatory_foe', goal: 4, xp: 195, gold: 115,
        enTitle: 'Phantom Gunslingers of the Roost',
        noTitle: 'Spøkelsesskytterne ved Observatoriet',
        enLore: 'Spectral outlaws guard Blackfeather\'s astral ruin. Outdraw four Phantom Outlaws!',
        noLore: 'Spektrale lovløse vokter Blackfeathers stjerneruin. Overvinn fire spøkelseslovløse!',
        enTask: "Defeat 4 Phantom Outlaws at Raven's Roost ↖",
        noTask: "Bekjemp 4 spøkelseslovløse ved Raven's Roost ↖"
      },
      {
        id: 'sa_6', targetType: 'blackfeather', goal: 1, xp: 320, gold: 215, lootId: 'astral_pocketwatch',
        enTitle: 'RAID: High Noon with Blackfeather',
        noTitle: 'RAID-BOSS: Duell mot Blackfeather',
        enLore: 'Face the fastest phantom gun in the West—BLACKFEATHER—beneath the spinning astrolabe of Raven\'s Roost!',
        noLore: 'Møt Vestens raskeste spøkelsesskytter — BLACKFEATHER — under den roterende astrolaben på Raven\'s Roost!',
        enTask: "Defeat World Boss BLACKFEATHER at Raven's Roost ↖",
        noTask: "Beseir verdensbossen BLACKFEATHER ved Raven's Roost ↖"
      },
      {
        id: 'sa_7', targetType: 'any_boss', goal: 3, xp: 360, gold: 260, lootId: 'high_marshal_star',
        enTitle: 'Grand Crusade of the Frontier',
        noTitle: 'Grenselandets Store Korstog',
        enLore: 'Defeat any three World Overlords solo or with your Co-op Posse to cement your legend forever!',
        noLore: 'Beseir tre valgfrie verdensbosser alene eller sammen med venner i Co-op for å krone legenden din!',
        enTask: 'Defeat any 3 World Bosses',
        noTask: 'Beseir 3 valgfrie verdensbosser'
      }
    ]
  }
];

export const MMO_UI_STRINGS = {
  en: {
    modeBtnSolo: '👥 Mode: Solo [M]',
    modeBtnCoop: (n) => `👥 Co-op Posse (${n}) [M]`,
    skillReady: (icon, name) => `${icon} [G] ${name}: READY`,
    skillCooldown: (icon, name, sec) => `${icon} [G] ${name}: ${sec}s`,
    xpBarText: (lv, xp, nextXp, className, relicCount) =>
      `★ Cowboy Lv.${lv} (${className}) • XP: ${xp}/${nextXp} • Equipped Relics: ${relicCount}/3`,
    levelUpToast: (lv) => `✨ LEVEL UP! Cowboy Level ${lv}! (+5 Max HP & +2% All Damage!)`,
    lootToast: (rarityLabel, itemName, stats) => `🎁 LOOT [${rarityLabel}]: ${itemName} (${stats})!`,
    npcInteractHint: 'Click / Trigger on Quest Givers (! / ?) to open Quest Scroll',
    questModalHeader: (npcName, zoneName) => `${npcName} — ${zoneName}`,
    questAvailableBadge: '❗ AVAILABLE QUEST',
    questInProgressBadge: '⏳ IN PROGRESS',
    questTurnInBadge: '❓ READY TO TURN IN!',
    questAcceptBtn: 'Accept Quest (!)',
    questTurnInBtn: 'Complete Quest & Claim Reward (?)',
    questCloseBtn: 'Close',
    questRewardsHdr: 'Guaranteed Quest Rewards:',
    trackerHeader: '📜 QUEST LOG & ZONE CHAINS',
    trackerTurnInReady: '✓ READY — Click to Turn In (?)',
    coopModalTitle: '🤠 GAME MODE, COWBOY CLASS & CO-OP MULTIPLAYER [M]',
    coopModeLabel: 'Select Game Mode:',
    coopSoloBtn: '👤 Singleplayer (Solo)',
    coopMultiBtn: '👥 Multiplayer (Co-op Posse)',
    coopNameLabel: 'Your Cowboy Name:',
    coopClassHeader: 'Choose Cowboy Class / Specialization (WoW Role + [G] Skill):',
    coopRelicsHeader: 'Equipped Western Relics / Trinkets (Top 3 Auto-Equipped):',
    coopNoRelics: 'Complete NPC Zone Quests or slay Bosses to earn Uncommon, Rare, Epic & Legendary Relics!',
    coopConnectHeader: '🌐 Co-op Posse Connection (Play Together Across PC, Phone, Pad & VR):',
    coopRealm1Btn: '🌍 Join Public World: Dustwood Realm #1',
    coopRealm2Btn: '🌍 Join Public World: Outlaw Realm #2',
    coopHostCodeBtn: '🤠 Create Private Posse Code',
    coopJoinCodeBtn: '🔗 Join Code',
    coopCopyLinkBtn: '📋 Copy Invite Link',
    coopDisconnectBtn: 'Leave Posse (Go Solo)',
    coopCodePlaceholder: 'Code (e.g. K7M4)',
    coopStatusSolo: 'Mode: Singleplayer (Solo World). Switch to Multiplayer anytime to play with friends!',
    coopStatusConnecting: (room) => `Connecting to Frontier Posse [${room}]...`,
    coopStatusOnline: (room, peersCount, isHost) =>
      `🟢 Connected to [${room}] (${isHost ? 'Realm Host' : 'Posse Rider'}) • Players in World: ${peersCount + 1}`,
    coopPartyHeader: '🤠 POSSE PARTY',
    coopTeleportBtn: '⚡ Ride To',
    coopChatPlaceholder: 'Send Posse message...',
    coopSendBtn: 'Send',
    emotes: [
      { id: 'howdy', label: '🤠 Howdy!', text: 'Howdy partner!' },
      { id: 'boss', label: '💀 Attack Boss!', text: 'Posse up! Attack the World Boss!' },
      { id: 'heal', label: '🌿 Need Heal!', text: 'Need healing tonic over here!' },
      { id: 'follow', label: '🐎 Follow Me!', text: 'Mount up & follow me!' }
    ],
    rarities: { uncommon: 'UNCOMMON', rare: 'RARE', epic: 'EPIC', legendary: 'LEGENDARY' }
  },
  no: {
    modeBtnSolo: '👥 Modus: Enspiller [M]',
    modeBtnCoop: (n) => `👥 Flerspiller (${n} i Posse) [M]`,
    skillReady: (icon, name) => `${icon} [G] ${name}: KLAR`,
    skillCooldown: (icon, name, sec) => `${icon} [G] ${name}: ${sec}s`,
    xpBarText: (lv, xp, nextXp, className, relicCount) =>
      `★ Cowboy Lv.${lv} (${className}) • XP: ${xp}/${nextXp} • Utstyrte Relikvier: ${relicCount}/3`,
    levelUpToast: (lv) => `✨ LEVEL UP! Cowboy-nivå ${lv}! (+5 Maks Helse & +2% All Skade!)`,
    lootToast: (rarityLabel, itemName, stats) => `🎁 BYTTE [${rarityLabel}]: ${itemName} (${stats})!`,
    npcInteractHint: 'Klikk / pek på oppdragsgivere (! / ?) i verden for oppdragsrull',
    questModalHeader: (npcName, zoneName) => `${npcName} — ${zoneName}`,
    questAvailableBadge: '❗ NYTT OPPDRAG KLART',
    questInProgressBadge: '⏳ UNDER ARBEID',
    questTurnInBadge: '❓ KLAR TIL INNLEVERING!',
    questAcceptBtn: 'Godta Oppdrag (!)',
    questTurnInBtn: 'Fullfør & Hent Belønning (?)',
    questCloseBtn: 'Lukk',
    questRewardsHdr: 'Garantert Oppdragsbelønning:',
    trackerHeader: '📜 OPPDRAGSLOGG (SONE-QUESTS)',
    trackerTurnInReady: '✓ KLAR — Klikk for å levere (?)',
    coopModalTitle: '🤠 SPILLEMODUS, COWBOY-KLASSE & FLERSPILLER CO-OP [M]',
    coopModeLabel: 'Velg Spillemodus:',
    coopSoloBtn: '👤 Enspiller (Solo)',
    coopMultiBtn: '👥 Flerspiller (Spill sammen i Co-op)',
    coopNameLabel: 'Ditt Cowboy-navn:',
    coopClassHeader: 'Velg Cowboy-klasse / Spesialisering (WoW-rolle + [G]-egenskap):',
    coopRelicsHeader: 'Utstyrte Western-relikvier / Trinkets (3 beste utstyres automatisk):',
    coopNoRelics: 'Fullfør sone-quests hos NPC-er med «!» eller fell bosser for Grønne, Blå, Episke og Legendariske relikvier!',
    coopConnectHeader: '🌐 Flerspiller / Posse-tilkobling (Spill sammen på PC, Telefon, Pad & VR):',
    coopRealm1Btn: '🌍 Åpen Verden: Dustwood Server #1',
    coopRealm2Btn: '🌍 Åpen Verden: Outlaw Server #2',
    coopHostCodeBtn: '🤠 Opprett Privat Posse-kode',
    coopJoinCodeBtn: '🔗 Koble til kode',
    coopCopyLinkBtn: '📋 Kopier invitasjonslenke',
    coopDisconnectBtn: 'Forlat Posse (Bytt til Enspiller)',
    coopCodePlaceholder: 'Kode (f.eks. K7M4)',
    coopStatusSolo: 'Modus: Enspiller (Solo). Du kan når som helst bytte til Flerspiller for å spille sammen med andre!',
    coopStatusConnecting: (room) => `Kobler til Grenselands-Posse [${room}]...`,
    coopStatusOnline: (room, peersCount, isHost) =>
      `🟢 Tilkoblet [${room}] (${isHost ? 'Verden-vert' : 'Posse-medlem'}) • Spillere i verden: ${peersCount + 1}`,
    coopPartyHeader: '🤠 DIN POSSE (LAG)',
    coopTeleportBtn: '⚡ Ri til venn',
    coopChatPlaceholder: 'Skriv melding til laget...',
    coopSendBtn: 'Send',
    emotes: [
      { id: 'howdy', label: '🤠 Hils!', text: 'Howdy partner!' },
      { id: 'boss', label: '💀 Angrip Boss!', text: 'Samle laget! Vi tar verdensbossen!' },
      { id: 'heal', label: '🌿 Trenger Heal!', text: 'Trenger helbredende eliksir her!' },
      { id: 'follow', label: '🐎 Følg meg!', text: 'Sitt opp på hesten og følg meg!' }
    ],
    rarities: { uncommon: 'UVANLIG', rare: 'SJELDEN', epic: 'EPISK', legendary: 'LEGENDARISK' }
  }
};
