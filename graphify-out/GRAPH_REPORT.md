# Graph Report - AwesomeGames  (2026-10-27)

## Corpus Check
- 173 files · ~94,610 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .mdc 5, (none) 2, .ico 1)

## Summary
- 2086 nodes · 5351 edges · 101 communities (96 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 2% INFERRED · 1% AMBIGUOUS · INFERRED: 125 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f49d9ed3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- character-options.ts
- rpg/services/room-connection.ts
- Legal Action Overlay
- Ability Hover Tooltip
- Character Abilities
- Host AI Providers
- Release PR Workflow
- Win Condition Tracking
- RoomMemberView
- Hex Board Rendering
- campaign-settings.ts
- leaders/services/room-connection.ts
- board.ts
- character.ts
- Release Workflow
- Vizier Portrait
- rules.ts
- Lobby Validation
- New Campaign State
- use-game-realtime.ts
- Hermit Portrait
- Banned UI Patterns
- P2P Room Lifecycle
- gm-turn.ts
- Room Member Updates
- use-game-realtime.ts
- Sniper Portrait
- room-code.ts
- game.types.ts
- Leader Portrait
- react
- Bruiser Portrait
- Manipulator Portrait
- Shaman Portrait
- campaign-tab-config.ts
- Wanderer Portrait
- new-campaign-form.tsx
- TypeScript Config
- table.ts
- Archer Portrait
- Rider Portrait
- package.json
- Acrobat Portrait
- Royal Guard Portrait
- team-options.tsx
- action-key.ts
- use-play.ts
- Brew Master Portrait
- Protector Portrait
- Root Layout
- character-form.tsx
- host-starting-loadout.ts
- Illusionist Portrait
- Jailor Portrait
- Tactician Portrait
- Wisp Portrait
- Port Test Checklist
- host-gm-prompt.ts
- Dashboard Game List
- P2P Module Map
- campaign-settings-import-export.ts
- game.types.ts
- Assassin Portrait
- Nemesis Portrait
- Route Sync Script
- Game Manifest
- Action Phase Rules
- Capture Timing Docs
- game-view-model.ts
- Claw Launcher Portrait
- Cub Portrait
- Frog Portrait
- App Route Types
- app/room/[code]/game/page.tsx
- inventory-dialog.tsx
- Lobby Panel Rows
- Leaders Card Art
- Project Readme
- character-tab-config.ts
- Game State Views
- legal-actions.ts
- Rules Engine Contract
- mesh.ts
- host-gm-turn.ts
- campaign-play.tsx
- rules.test.ts
- Client Port Contract
- Entering Game Overlay
- PostCSS Config
- Cache Life Export
- Cache Tag Export
- CampaignSettings
- Mesh
- Protector
- characterOptionsFor
- eslint.config.mjs
- rpg/paths.ts
- dependencies
- scripts
- host-situation.ts
- CharacterOptions

## God Nodes (most connected - your core abstractions)
1. `useNewCampaign()` - 41 edges
2. `IllegalGameMoveException` - 40 edges
3. `react` - 37 edges
4. `isOccupied()` - 29 edges
5. `GameActiveView()` - 29 edges
6. `useGamePage()` - 27 edges
7. `PieceType` - 27 edges
8. `GameStateView` - 27 edges
9. `RoomConnectionError` - 25 edges
10. `next` - 25 edges

## Surprising Connections (you probably didn't know these)
- `openMesh` --semantically_similar_to--> `openMesh`  [INFERRED] [semantically similar]
  README.md → docs/p2p-client-port.md
- `room-connection.ts` --semantically_similar_to--> `room-connection.ts`  [INFERRED] [semantically similar]
  README.md → docs/p2p-client-port.md
- `Leaders Routes` --semantically_similar_to--> `leaders/app`  [INFERRED] [semantically similar]
  README.md → docs/p2p-client-port.md
- `Leaders Game` --semantically_similar_to--> `Leaders P2P Client`  [INFERRED] [semantically similar]
  README.md → docs/p2p-client-port.md
- `Awesome Games` --conceptually_related_to--> `P2P Client Port Contract`  [INFERRED]
  README.md → docs/p2p-client-port.md

## Import Cycles
- 2-file cycle: `rpg/lib/campaign-settings.ts -> rpg/lib/campaign-tab-config.ts -> rpg/lib/campaign-settings.ts`
- 2-file cycle: `rpg/lib/campaign-settings.ts -> rpg/lib/character-tab-config.ts -> rpg/lib/campaign-settings.ts`
- 3-file cycle: `rpg/lib/campaign-settings.ts -> rpg/lib/character-tab-config.ts -> rpg/lib/campaign-tab-config.ts -> rpg/lib/campaign-settings.ts`

## Hyperedges (group relationships)
- **Uncertain motif readings** — public_leaders_characters_frog_pink_head_tuft, public_leaders_characters_frog_tuft_identity, public_leaders_characters_frog_blue_base, public_leaders_characters_frog_base_identity [AMBIGUOUS 0.20]
- **Leaders Client Port Stack** — docs_p2p_client_port_open_mesh, docs_p2p_client_port_room_connection, docs_p2p_client_port_leaders_domain, docs_p2p_client_port_leaders_app [EXTRACTED 1.00]
- **Peer Consensus Invariants** — docs_p2p_client_port_consensus, docs_p2p_client_port_shared_game_state, docs_p2p_client_port_game_state_factory, docs_p2p_client_port_legal_actions_resolver [EXTRACTED 1.00]
- **Multi-step Pending Abilities** — docs_p2p_client_port_leader, docs_p2p_client_port_acrobat, docs_p2p_client_port_royal_guard, docs_p2p_client_port_manipulator [EXTRACTED 1.00]
- **Acrobat costume** — public_leaders_characters_acrobat_tan_arm_wraps, public_leaders_characters_acrobat_pink_ribbons, public_leaders_characters_acrobat_pink_star_ornaments [EXTRACTED 1.00]
- **Frog features** — public_leaders_characters_acrobat_blue_frog, public_leaders_characters_acrobat_mottled_blue_skin, public_leaders_characters_acrobat_pale_muzzle, public_leaders_characters_acrobat_half_lidded_red_eyes, public_leaders_characters_acrobat_splayed_hands [EXTRACTED 1.00]
- **Drawn archery kit** — public_leaders_characters_archer_magenta_recurve_bow, public_leaders_characters_archer_nocked_arrow, public_leaders_characters_archer_hip_quiver [EXTRACTED 1.00]
- **Archer costume** — public_leaders_characters_archer_purple_eye_mask, public_leaders_characters_archer_teal_cape, public_leaders_characters_archer_teal_tunic, public_leaders_characters_archer_purple_sleeves_and_leggings, public_leaders_characters_archer_orange_forearm_wraps, public_leaders_characters_archer_purple_waist_sash, public_leaders_characters_archer_magenta_ribbon, public_leaders_characters_archer_brown_cuffed_boots [EXTRACTED 1.00]
- **Leaping bow shot** — public_leaders_characters_archer_archer, public_leaders_characters_archer_magenta_recurve_bow, public_leaders_characters_archer_nocked_arrow, public_leaders_characters_archer_leaping_full_draw [EXTRACTED 1.00]
- **Armed grip** — public_leaders_characters_assassin_assassin, public_leaders_characters_assassin_pale_blue_hand, public_leaders_characters_assassin_curved_blade [EXTRACTED 1.00]
- **Faceless hood** — public_leaders_characters_assassin_assassin, public_leaders_characters_assassin_tattered_hooded_cloak, public_leaders_characters_assassin_obscured_face, public_leaders_characters_assassin_glowing_magenta_eyes [EXTRACTED 1.00]
- **Worn outfit** — public_leaders_characters_assassin_tattered_hooded_cloak, public_leaders_characters_assassin_chest_strap, public_leaders_characters_assassin_orange_waist_wrap, public_leaders_characters_assassin_dark_lower_garment [EXTRACTED 1.00]
- **Boar head features** — public_leaders_characters_bruiser_anthropomorphic_boar, public_leaders_characters_bruiser_shaggy_mane, public_leaders_characters_bruiser_glowing_orange_eyes, public_leaders_characters_bruiser_curved_ivory_tusks, public_leaders_characters_bruiser_lower_tusks, public_leaders_characters_bruiser_pink_snout [EXTRACTED 1.00]
- **Aggressive heavy silhouette** — public_leaders_characters_bruiser_bruiser, public_leaders_characters_bruiser_muscular_build, public_leaders_characters_bruiser_hunched_combat_stance, public_leaders_characters_bruiser_clenched_fists [EXTRACTED 1.00]
- **Worn ornaments** — public_leaders_characters_bruiser_gold_armbands, public_leaders_characters_bruiser_leather_bracers, public_leaders_characters_bruiser_gold_belt_buckle, public_leaders_characters_bruiser_green_loincloth, public_leaders_characters_bruiser_meander_hem [EXTRACTED 1.00]
- **Face read of the figure** — public_leaders_characters_claw_launcher_clawlauncher, public_leaders_characters_claw_launcher_teal_spiky_hair, public_leaders_characters_claw_launcher_orange_goggles, public_leaders_characters_claw_launcher_bared_teeth [EXTRACTED 1.00]
- **Armored fighter with raised launcher** — public_leaders_characters_claw_launcher_clawlauncher, public_leaders_characters_claw_launcher_mechanical_launcher, public_leaders_characters_claw_launcher_orange_armor, public_leaders_characters_claw_launcher_wide_stance, public_leaders_characters_claw_launcher_hip_canister [EXTRACTED 1.00]
- **Cub visual identity** — public_leaders_characters_cub_cub, public_leaders_characters_cub_orange_gold_fur, public_leaders_characters_cub_cream_muzzle_chest_and_belly, public_leaders_characters_cub_magenta_markings, public_leaders_characters_cub_black_claws, public_leaders_characters_cub_upright_standing_pose, public_leaders_characters_cub_upward_closed_eye_expression [EXTRACTED 1.00]
- **Frog visual identity** — public_leaders_characters_frog_frog, public_leaders_characters_frog_teal_body, public_leaders_characters_frog_yellow_eyes, public_leaders_characters_frog_pink_head_tuft, public_leaders_characters_frog_orange_chest_spots, public_leaders_characters_frog_blue_base, public_leaders_characters_frog_seated_pose [EXTRACTED 1.00]
- **Hermit costume** — public_leaders_characters_hermit_hermit, public_leaders_characters_hermit_orange_fur_cloak, public_leaders_characters_hermit_cream_fur_collar, public_leaders_characters_hermit_magenta_fur_stripes, public_leaders_characters_hermit_orange_fur_hem, public_leaders_characters_hermit_brown_tunic, public_leaders_characters_hermit_magenta_leg_markings [EXTRACTED 1.00]
- **Hermit facial appearance** — public_leaders_characters_hermit_hermit, public_leaders_characters_hermit_elderly_man, public_leaders_characters_hermit_tan_skin, public_leaders_characters_hermit_white_hair, public_leaders_characters_hermit_white_beard, public_leaders_characters_hermit_green_eyes, public_leaders_characters_hermit_stern_expression [EXTRACTED 1.00]
- **Hermit staff** — public_leaders_characters_hermit_hermit, public_leaders_characters_hermit_wooden_staff, public_leaders_characters_hermit_three_pronged_staff_head, public_leaders_characters_hermit_right_hand_staff_grip [EXTRACTED 1.00]
- **Costume and Jewelry** — public_leaders_characters_illusionist_gold_medallion_collar, public_leaders_characters_illusionist_gold_armbands, public_leaders_characters_illusionist_white_draped_garment [EXTRACTED 1.00]
- **Floating Conjuring Pose** — public_leaders_characters_illusionist_illusionist, public_leaders_characters_illusionist_levitating_pose, public_leaders_characters_illusionist_blue_spiral [EXTRACTED 1.00]
- **Tailed Rounded Silhouette** — public_leaders_characters_illusionist_rotund_pink_body, public_leaders_characters_illusionist_segmented_tail, public_leaders_characters_illusionist_curved_head_stalks [EXTRACTED 1.00]
- **Cephalopod body** — public_leaders_characters_jailor_cephalopod_head, public_leaders_characters_jailor_stern_face, public_leaders_characters_jailor_tentacles, public_leaders_characters_jailor_blue_skin [EXTRACTED 1.00]
- **Formal costume** — public_leaders_characters_jailor_gold_bands, public_leaders_characters_jailor_magenta_cloak, public_leaders_characters_jailor_gold_medallion, public_leaders_characters_jailor_gray_trousers, public_leaders_characters_jailor_dark_boots [EXTRACTED 1.00]
- **Teal tunic, cream cape, purple gloves, and purple trousers** — public_leaders_characters_leader_teal_tunic, public_leaders_characters_leader_cream_cape, public_leaders_characters_leader_purple_gloves, public_leaders_characters_leader_purple_trousers [EXTRACTED 1.00]
- **Beard, curled mustache, brown hair, tan skin, and stern gaze** — public_leaders_characters_leader_brown_beard, public_leaders_characters_leader_curled_black_mustache, public_leaders_characters_leader_brown_hair, public_leaders_characters_leader_warm_skin_tone, public_leaders_characters_leader_stern_expression [EXTRACTED 1.00]
- **Crown, staff, cape, shoulder medallions, and gold buckle worn together** — public_leaders_characters_leader_golden_crown, public_leaders_characters_leader_green_cuboid_staff, public_leaders_characters_leader_cream_cape, public_leaders_characters_leader_gold_shoulder_medallions, public_leaders_characters_leader_brown_belt_gold_buckle [EXTRACTED 1.00]
- **Purple costume of gown, bodice, coral sash, and long gloves** — public_leaders_characters_manipulator_purple_gown, public_leaders_characters_manipulator_dark_bodice, public_leaders_characters_manipulator_coral_sash, public_leaders_characters_manipulator_purple_gloves [EXTRACTED 1.00]
- **Head design of dark face, red eyes, and ribboned braid loops** — public_leaders_characters_manipulator_dark_face, public_leaders_characters_manipulator_red_eyes, public_leaders_characters_manipulator_braided_updo, public_leaders_characters_manipulator_coral_hair_ribbons [EXTRACTED 1.00]
- **Nemesis spectral apparition** — public_leaders_characters_nemesis_nemesis, public_leaders_characters_nemesis_spectral_skull, public_leaders_characters_nemesis_spiked_crest, public_leaders_characters_nemesis_dark_armor, public_leaders_characters_nemesis_orb_staff, public_leaders_characters_nemesis_glowing_torso, public_leaders_characters_nemesis_spectral_tendrils, public_leaders_characters_nemesis_clawed_limb, public_leaders_characters_nemesis_shoulder_appendage [EXTRACTED 1.00]
- **Dark armored silhouette** — public_leaders_characters_nemesis_dark_armor, public_leaders_characters_nemesis_spiked_crest, public_leaders_characters_nemesis_shoulder_appendage, public_leaders_characters_nemesis_clawed_limb [EXTRACTED 1.00]
- **Shared coral spectral glow** — public_leaders_characters_nemesis_spectral_skull, public_leaders_characters_nemesis_orb_staff, public_leaders_characters_nemesis_glowing_torso, public_leaders_characters_nemesis_spectral_tendrils [EXTRACTED 1.00]
- **Seasonal growth on the living tree** — public_leaders_characters_protector_blossom_crown, public_leaders_characters_protector_autumn_leaf_cascade, public_leaders_characters_protector_pink_blossom_cluster, public_leaders_characters_protector_vine_tendrils [EXTRACTED 1.00]
- **Small creature visual traits** — public_leaders_characters_rider_small_creature, public_leaders_characters_rider_purple_body, public_leaders_characters_rider_curled_cranial_appendages, public_leaders_characters_rider_teal_appendages [EXTRACTED 1.00]
- **Feline visual traits** — public_leaders_characters_rider_feline_mount, public_leaders_characters_rider_spotted_cream_coat, public_leaders_characters_rider_pink_harness, public_leaders_characters_rider_bared_fangs, public_leaders_characters_rider_raised_tail [EXTRACTED 1.00]
- **Shield-and-axe fighting pose** — public_leaders_characters_royal_guard_royalguard, public_leaders_characters_royal_guard_long_hafted_axe, public_leaders_characters_royal_guard_round_shield, public_leaders_characters_royal_guard_crouched_stance [EXTRACTED 1.00]
- **Isolated cel-shaded character portrait** — public_leaders_characters_royal_guard, public_leaders_characters_royal_guard_royalguard, public_leaders_characters_royal_guard_cel_shaded_style, public_leaders_characters_royal_guard_isolated_figure, public_leaders_characters_royal_guard_heavy_build [EXTRACTED 1.00]
- **Orange-maned creature appearance** — public_leaders_characters_shaman_creature, public_leaders_characters_shaman_orange_mane, public_leaders_characters_shaman_feathered_headdress, public_leaders_characters_shaman_green_face, public_leaders_characters_shaman_yellow_eyes, public_leaders_characters_shaman_purple_limbs [EXTRACTED 1.00]
- **Small human appearance** — public_leaders_characters_shaman_human, public_leaders_characters_shaman_maroon_hat, public_leaders_characters_shaman_beige_coat, public_leaders_characters_shaman_brow_gesture [EXTRACTED 1.00]
- **Smoke, staff, and foliage** — public_leaders_characters_shaman_green_smoke, public_leaders_characters_shaman_staff, public_leaders_characters_shaman_foliage [EXTRACTED 1.00]
- **Field costume** — public_leaders_characters_sniper_teal_trousers, public_leaders_characters_sniper_orange_knee_armor, public_leaders_characters_sniper_orange_hip_plate, public_leaders_characters_sniper_black_boots [EXTRACTED 1.00]
- **Rifle color blocking** — public_leaders_characters_sniper_tall_rifle, public_leaders_characters_sniper_gold_rifle_body, public_leaders_characters_sniper_teal_rifle_accents, public_leaders_characters_sniper_green_t_shaped_muzzle_fitting, public_leaders_characters_sniper_black_lower_rifle_section [EXTRACTED 1.00]
- **Sniper silhouette** — public_leaders_characters_sniper_sniper, public_leaders_characters_sniper_crouching_stance, public_leaders_characters_sniper_tall_rifle, public_leaders_characters_sniper_dark_round_goggles [EXTRACTED 1.00]
- **Seat and smoke under the figure** — public_leaders_characters_tactician_tactician, public_leaders_characters_tactician_red_spiked_seat, public_leaders_characters_tactician_smoke_wisps [EXTRACTED 1.00]
- **Tactician costume** — public_leaders_characters_tactician_tactician, public_leaders_characters_tactician_conical_hat, public_leaders_characters_tactician_teal_updo, public_leaders_characters_tactician_half_lidded_eyes, public_leaders_characters_tactician_gold_hoop_earrings, public_leaders_characters_tactician_layered_robes [EXTRACTED 1.00]
- **Purple face with closed eyes and a long mustache** — public_leaders_characters_vizier_vizier, public_leaders_characters_vizier_purple_skin, public_leaders_characters_vizier_bald_head, public_leaders_characters_vizier_closed_eyes, public_leaders_characters_vizier_parted_lips, public_leaders_characters_vizier_long_mustache [EXTRACTED 1.00]
- **Ceremonial headdress, gold ornaments, and layered robes** — public_leaders_characters_vizier_tall_headdress, public_leaders_characters_vizier_eye_emblem, public_leaders_characters_vizier_gold_collar, public_leaders_characters_vizier_gold_cuffs, public_leaders_characters_vizier_cream_sleeves, public_leaders_characters_vizier_white_panel, public_leaders_characters_vizier_chest_emblem, public_leaders_characters_vizier_striped_trousers, public_leaders_characters_vizier_purple_shoes [EXTRACTED 1.00]
- **Front-facing stance with joined hands and a warm glow** — public_leaders_characters_vizier_prayer_gesture, public_leaders_characters_vizier_closed_eyes, public_leaders_characters_vizier_front_facing_pose, public_leaders_characters_vizier_warm_glow [EXTRACTED 1.00]
- **Wanderer costume** — public_leaders_characters_wanderer_wanderer, public_leaders_characters_wanderer_purple_outfit, public_leaders_characters_wanderer_round_buckle, public_leaders_characters_wanderer_forearm_wraps, public_leaders_characters_wanderer_hoop_earrings, public_leaders_characters_wanderer_dark_boots [EXTRACTED 1.00]
- **Wanderer creature silhouette** — public_leaders_characters_wanderer_wanderer, public_leaders_characters_wanderer_winged_humanoid, public_leaders_characters_wanderer_bat_wings, public_leaders_characters_wanderer_blue_topknot, public_leaders_characters_wanderer_pointed_ears, public_leaders_characters_wanderer_short_snout, public_leaders_characters_wanderer_pink_skin, public_leaders_characters_wanderer_clawed_hands [EXTRACTED 1.00]
- **Wanderer flight presentation** — public_leaders_characters_wanderer_wanderer, public_leaders_characters_wanderer_bat_wings, public_leaders_characters_wanderer_airborne_pose [EXTRACTED 1.00]
- **Facial features** — public_leaders_characters_will_o_the_wisp_cartoon_face, public_leaders_characters_will_o_the_wisp_circular_eye, public_leaders_characters_will_o_the_wisp_upper_circular_mark [EXTRACTED 1.00]
- **Mechanical orb assembly** — public_leaders_characters_will_o_the_wisp_navy_spherical_chassis, public_leaders_characters_will_o_the_wisp_cartoon_face, public_leaders_characters_will_o_the_wisp_circular_eye, public_leaders_characters_will_o_the_wisp_paired_antennae, public_leaders_characters_will_o_the_wisp_radial_side_grille, public_leaders_characters_will_o_the_wisp_underside_nozzle [EXTRACTED 1.00]
- **Spectral flame aura** — public_leaders_characters_will_o_the_wisp_willothewisp, public_leaders_characters_will_o_the_wisp_cyan_flame_envelope, public_leaders_characters_will_o_the_wisp_basal_flame_ring, public_leaders_characters_will_o_the_wisp_floating_posture [EXTRACTED 1.00]
- **Leader character illustration asset** — public_leaders_characters_claw_launcher, public_leaders_characters_claw_launcher_clawlauncher, public_leaders_characters_claw_launcher_leader_role, public_leaders_characters_claw_launcher_cartoon_rendering [INFERRED 0.75]
- **Open hands grouped with the side mass and floating shapes** — public_leaders_characters_manipulator_outstretched_pose, public_leaders_characters_manipulator_dark_purple_mass, public_leaders_characters_manipulator_floating_shapes, public_leaders_characters_manipulator_purple_gloves [INFERRED 0.75]
- **Fan banner as command emblem** — public_leaders_characters_tactician_tactician, public_leaders_characters_tactician_mask_banner, public_leaders_characters_tactician_folk_stage_styling [INFERRED 0.75]
- **Royal leader silhouette** — public_dashboard_leaders_golden_crown, public_dashboard_leaders_handlebar_mustache, public_dashboard_leaders_teal_gold_regalia, public_dashboard_leaders_raised_weapon [INFERRED 0.85]
- **Performance silhouette** — public_leaders_characters_acrobat_balancing_pole, public_leaders_characters_acrobat_outstretched_arms, public_leaders_characters_acrobat_smug_expression [INFERRED 0.85]
- **Carried gear** — public_leaders_characters_brew_master_pink_gourd_flasks, public_leaders_characters_brew_master_hip_satchel, public_leaders_characters_brew_master_golden_handheld_object [INFERRED 0.85]
- **Character silhouette** — public_leaders_characters_brew_master_brewmaster, public_leaders_characters_brew_master_rotund_build, public_leaders_characters_brew_master_gray_rounded_mass, public_leaders_characters_brew_master_cheerful_expression [INFERRED 0.85]
- **Isolated full-body portrait presentation** — public_leaders_characters_frog, public_leaders_characters_frog_frog, public_leaders_characters_frog_plain_background, public_leaders_characters_frog_glossy_cartoon_style, public_leaders_characters_frog_seated_pose [INFERRED 0.85]
- **Warden presentation** — public_leaders_characters_jailor_jailor, public_leaders_characters_jailor_crossed_arms, public_leaders_characters_jailor_glowing_pink_chain, public_leaders_characters_jailor_magenta_cloak [INFERRED 0.85]
- **Warding bulk** — public_leaders_characters_protector_bark_torso, public_leaders_characters_protector_wooden_side_plates, public_leaders_characters_protector_glowing_green_sigils, public_leaders_characters_protector_forest_guardian [INFERRED 0.85]
- **Mounted pair shown as one character** — public_leaders_characters_rider_rider, public_leaders_characters_rider_small_creature, public_leaders_characters_rider_feline_mount [INFERRED 0.85]
- **Purple-and-gold royal regalia** — public_leaders_characters_royal_guard_visored_helmet, public_leaders_characters_royal_guard_scale_pauldrons, public_leaders_characters_royal_guard_purple_gold_palette, public_leaders_characters_royal_guard_round_shield, public_leaders_characters_royal_guard_crown_emblem [INFERRED 0.85]
- **Worn costume** — public_leaders_characters_brew_master_orange_headband, public_leaders_characters_brew_master_orange_tunic, public_leaders_characters_brew_master_pink_waist_sash, public_leaders_characters_brew_master_teal_trousers [INFERRED 0.95]

## Communities (101 total, 5 thin omitted)

### Community 0 - "character-options.ts"
Cohesion: 0.12
Nodes (37): capitalize(), CharacterStatRow, CORE_SKILLS, CORE_STATS, isId(), isPool(), isRankedCore(), isRecord() (+29 more)

### Community 1 - "rpg/services/room-connection.ts"
Cohesion: 0.06
Nodes (88): finishCreate(), useRoom(), findClaim(), coreCharacterOptions(), removeGmError(), readHostAi(), isRecord(), parseHostSession() (+80 more)

### Community 2 - "Legal Action Overlay"
Cohesion: 0.14
Nodes (44): ActionChoiceOverlay(), GameActiveView(), RecruitmentOfferOverlay(), useGamePage(), hydrateMembership(), recruitmentZoneCellIdsForColor(), abilityActionSelectsHexTarget(), abilityActionSelectsPieceTarget() (+36 more)

### Community 3 - "Ability Hover Tooltip"
Cohesion: 0.10
Nodes (32): AbilityTooltipAnchor, CharacterAbilityHoverTooltip(), CharacterAbilityHoverTooltipProps, clampTooltipToViewport(), computeAbilityTooltipAnchor(), CharacterAbilityText(), CharacterAbilityTextProps, CharacterCard() (+24 more)

### Community 4 - "Character Abilities"
Cohesion: 0.21
Nodes (39): Brewmaster, Cub, Hermit, acrobat(), acrobatJumpTargets(), acrobatLanding(), adjacentToEnemy(), applyCharacterAbility() (+31 more)

### Community 5 - "Host AI Providers"
Cohesion: 0.11
Nodes (30): metadata, RpgHomePage(), LandingScreen(), HealthIcon(), PencilIcon(), ProviderForm(), ProviderFormProps, ProviderHealth() (+22 more)

### Community 6 - "Release PR Workflow"
Cohesion: 0.05
Nodes (38): default, description, options, required, type, concurrency, cancel-in-progress, group (+30 more)

### Community 7 - "Win Condition Tracking"
Cohesion: 0.08
Nodes (42): GameActiveViewProps, GameTurnStatus(), GameTurnStatusProps, GameWinOverlay(), GameWinOverlayProps, PlayerStatsCard(), StatRow(), HexGameBoardProps (+34 more)

### Community 8 - "RoomMemberView"
Cohesion: 0.07
Nodes (35): PresenceEvent, RoomRecord, Seat, formatLinkStatus(), ROLE_ORDER, RoomConnectionPanel(), RoomConnectionPanelProps, RoomLobbyPanelProps (+27 more)

### Community 9 - "Hex Board Rendering"
Cohesion: 0.16
Nodes (25): HexGameBoard(), boardNeighborCellIds(), BLACK_CROWN_CELL_ID, BLACK_RECRUITMENT_ZONE_CELL_IDS, BOARD_CELL_COUNT, BOARD_CELLS, BOARD_ROW_SIZES, BoardCellLayout (+17 more)

### Community 10 - "campaign-settings.ts"
Cohesion: 0.09
Nodes (41): CampaignStepId, Check, Choice, DEATH_PENALTIES, DeathPenaltyId, ENEMY_DIFFICULTIES, EnemyDifficultyId, hasLineBreak() (+33 more)

### Community 11 - "leaders/services/room-connection.ts"
Cohesion: 0.09
Nodes (60): openMesh(), withGame(), adoptHostRecord(), adoptPromotedHost(), agentLog(), applyMemberRoles(), applyRemoteGame(), asRecord() (+52 more)

### Community 12 - "board.ts"
Cohesion: 0.16
Nodes (15): AXIAL_DIRECTIONS, AxialCell, axialKey(), BLACK_CROWN_CELL_ID, BLACK_RECRUITMENT_ZONE, blackZone, byId, byKey (+7 more)

### Community 13 - "character.ts"
Cohesion: 0.23
Nodes (13): addCharacter(), characterError(), matchesClassStats(), parseStatBlock(), pointCap(), readAssignedStats(), readName(), readRacePicks() (+5 more)

### Community 14 - "Release Workflow"
Cohesion: 0.07
Nodes (27): concurrency, cancel-in-progress, group, GH_TOKEN, TAG, TARGET, jobs, release (+19 more)

### Community 15 - "Vizier Portrait"
Cohesion: 0.08
Nodes (28): Vizier character art, Bald head, Ceremonial official, Orange peaked chest emblem, Closed eyes, Wide cream sleeves, Green eye emblem, Marks flanking the eye (+20 more)

### Community 16 - "rules.ts"
Cohesion: 0.18
Nodes (29): nemesisLandingCells(), recruitmentZone(), isLeaderDown(), consumeVizierPassive(), handOf(), opponent(), playerIdFor(), applyEndAction() (+21 more)

### Community 17 - "Lobby Validation"
Cohesion: 0.15
Nodes (27): assertCanSubmitCommand(), assertRoomName(), assertUsername(), canReadChat(), chooseSeatRole(), CODE_ALPHABET, connectionPresence(), createRoom() (+19 more)

### Community 18 - "New Campaign State"
Cohesion: 0.12
Nodes (29): EMPTY_PREFILL, presetCharacterConfiguration(), useNewCampaign(), applyPresetToConfiguration(), back(), clearResult(), edit(), exportCampaignSettings() (+21 more)

### Community 19 - "use-game-realtime.ts"
Cohesion: 0.27
Nodes (10): presenceFromMembership(), useRoomPresence(), applyRoleUsername(), guestJoinedFromMembers(), membersFromUnknownPayload(), participantUsernamesFromMembers(), participantUsernamesFromMembership(), participantUsernamesFromPresencePayload() (+2 more)

### Community 20 - "Hermit Portrait"
Cohesion: 0.08
Nodes (24): Antler-like staff head, Plain black field, Brown tunic, Cream fur collar, Crouching pose, Elderly man, Green eyes, Hermit (+16 more)

### Community 21 - "Banned UI Patterns"
Cohesion: 0.09
Nodes (17): Banned UI Patterns, Linear Benchmark, True Dark Colours, Alabaster Pure, Charcoal Studio, Cloud Canvas, Colour Palettes, Palette CSS Custom Properties (+9 more)

### Community 22 - "P2P Room Lifecycle"
Cohesion: 0.13
Nodes (23): Chat, CreateRoomUseCaseTests, Disconnect, Game Traffic Permissions, Invite Code, JoinRoom, JoinRoomUseCaseTests, LeaveRoomUseCaseTests (+15 more)

### Community 23 - "gm-turn.ts"
Cohesion: 0.08
Nodes (45): equipmentAdjustments(), abilityLabel(), applyResolvedBeat(), applyWoundCount(), CheckDifficulty, CheckFailure, commitCheckBeat(), CURRENCY_MAX (+37 more)

### Community 24 - "Room Member Updates"
Cohesion: 0.24
Nodes (19): memberViews(), tryCommit(), actionMessage(), appendChat(), bindPeer(), broadcast(), broadcastState(), commitChat() (+11 more)

### Community 25 - "use-game-realtime.ts"
Cohesion: 0.20
Nodes (22): toGameStateView(), deriveConnectionError(), deriveConnectionStatus(), GameRealtimeConnectionStatus, useGameRealtime(), UseGameRealtimeOptions, useRoomChat(), useRoomConnection() (+14 more)

### Community 26 - "Sniper Portrait"
Cohesion: 0.09
Nodes (24): Anthropomorphic long-beaked figure, Black boots, Black lower rifle section, Character illustration, Crouching stance, Dark round goggles, Gold rifle body, Green T-shaped muzzle fitting (+16 more)

### Community 27 - "room-code.ts"
Cohesion: 0.16
Nodes (18): metadata, RpgRoomPage(), SessionPanels(), loadExistingSave(), openSave(), SessionPanelsProps, readBrowserSave(), startLobbyFromSave() (+10 more)

### Community 28 - "game.types.ts"
Cohesion: 0.32
Nodes (13): axialDistance(), isStraightLine(), isVisible(), lineBetween(), countsAsCaptor(), isLeaderCaptured(), isLeaderSurrounded(), opponentLeader() (+5 more)

### Community 29 - "Leader Portrait"
Cohesion: 0.11
Nodes (22): Solid black background, Full brown beard covering jaw, chin, and upper chest, Brown belt with a large round gold buckle, Brown hair at the temples and sideburns, continuous with the beard, Unread embossed mark on the gold buckle, Pale shoulder trim, fur or light cloth, Open cream cape hanging from the shoulders, Thick black mustache with upward curls (+14 more)

### Community 30 - "react"
Cohesion: 0.13
Nodes (24): useGameEndActions(), RoomActiveView(), RoomActiveViewProps, formatSentAt(), RoomChatPanel(), RoomChatPanelProps, RoomCodeCopy(), RoomCodeCopyProps (+16 more)

### Community 31 - "Bruiser Portrait"
Cohesion: 0.10
Nodes (21): Anthropomorphic boar, Black backdrop, Bruiser, Unclear buckle relief, Cel-shaded full-body illustration, Clenched fists, Large curved ivory tusks, Dark planted feet (+13 more)

### Community 32 - "Manipulator Portrait"
Cohesion: 0.13
Nodes (22): Manipulator character art, Solid black background, Cream looped-braid updo, Coral-red hair ribbons, Coral waist sash, Dark purple fitted bodice, Near-black featureless face, Large dark purple rounded mass (+14 more)

### Community 33 - "Shaman Portrait"
Cohesion: 0.17
Nodes (20): Shaman character art, Beige coat, Black backdrop, Hand raised to brow, Ceremonial mask, Large orange-maned creature, Feathered headdress, Green foliage (+12 more)

### Community 34 - "campaign-tab-config.ts"
Cohesion: 0.10
Nodes (28): readGameStep(), readMultiline(), BOSS_DIFFICULTIES, BossDifficulty, CAMPAIGN_TAGS, CampaignDropdownPrefill, CampaignTagId, Check (+20 more)

### Community 35 - "Wanderer Portrait"
Cohesion: 0.12
Nodes (19): Airborne forward lean, Pink bat wings, Blue hair topknot, Clawed hands, Crescent buckle mark, Dark pointed boots, Purple forearm wraps, Hoop earrings (+11 more)

### Community 36 - "new-campaign-form.tsx"
Cohesion: 0.26
Nodes (15): metadata, NewCampaignPage(), CampaignTabPanel(), CharacterTabPanel(), CheckboxField(), FieldDescription(), fieldSpanClass(), FormSection() (+7 more)

### Community 37 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 38 - "table.ts"
Cohesion: 0.13
Nodes (30): parseItemModifiers(), parseItemSlot(), Owner, Wound, CheckResolution, createTable(), emptyLocation(), isDeathPenalty() (+22 more)

### Community 39 - "Archer Portrait"
Cohesion: 0.12
Nodes (18): Female-presenting archer, Black surrounding field, Brown cuffed boots, Archer character art, Dark handwear, Flat cartoon rendering, Hip quiver with magenta fletching, Leaping full-draw pose (+10 more)

### Community 40 - "Rider Portrait"
Cohesion: 0.14
Nodes (18): Rider character art, Open mouth with bared fangs, Soft-shaded cartoon sprite, Curled cranial appendages, Solid black field, Pale spotted big cat, Horns or antennae, Leaders character asset (+10 more)

### Community 41 - "package.json"
Cohesion: 0.16
Nodes (16): devDependencies, tailwindcss@^4, @tailwindcss/postcss@^4, @types/node@^20, @types/react@^19, @types/react-dom@^19, typescript@^5, name (+8 more)

### Community 42 - "Acrobat Portrait"
Cohesion: 0.19
Nodes (16): Acrobat, Possible transparent background, Brown pole with a purple tip, Solid black field, Anthropomorphic blue frog, Half-lidded red eyes, Leaders character portrait, Mottled blue skin (+8 more)

### Community 43 - "Royal Guard Portrait"
Cohesion: 0.12
Nodes (16): Solid black surrounding field, Cel-shaded cartoon rendering, Face fully concealed, Crouched ready stance, Gold crown emblem, Heavy-set humanoid build, Isolated single figure, Golden long-hafted axe (+8 more)

### Community 44 - "team-options.tsx"
Cohesion: 0.16
Nodes (23): LockedList(), LockedOptions(), LockedTraits(), OptionList(), TeamOptions(), TeamOptionsProps, TraitEditor(), clearModifierStat() (+15 more)

### Community 45 - "action-key.ts"
Cohesion: 0.23
Nodes (12): AbilityParamValue, base64UrlDecode(), base64UrlEncode(), coerceParam(), COMMAND_TYPES, decodeActionKey(), encodeActionKey(), normalizeParams() (+4 more)

### Community 46 - "use-play.ts"
Cohesion: 0.30
Nodes (9): PlayPanel(), PlayMode, usePlay(), getRememberedUsername(), rememberUsername(), createRoom(), createRoomCode(), joinRoom() (+1 more)

### Community 47 - "Brew Master Portrait"
Cohesion: 0.14
Nodes (16): Brew Master character art, Brew Master, Cheerful closed-eye smile, Small golden object in the raised hand, Large gray rounded mass behind the head, Hair bun or carried sack, Tan hip satchel, Leader character asset (+8 more)

### Community 48 - "Protector Portrait"
Cohesion: 0.22
Nodes (16): Protector portrait, Autumn leaf cascade, Bulbous bark torso, Pink blossom crown, Forest guardian, Glowing green sigils, Leader character, Nested bird (+8 more)

### Community 49 - "Root Layout"
Cohesion: 0.13
Nodes (8): geistMono, geistSans, metadata, AppPageConfig, __Check, __IsExpected, LayoutConfig, __Unused

### Community 50 - "character-form.tsx"
Cohesion: 0.18
Nodes (19): Alert(), CharacterForm(), CharacterFormProps, ChoiceField(), ClaimForm(), ClaimFormProps, raceAdjustment(), readStatPoints() (+11 more)

### Community 51 - "host-starting-loadout.ts"
Cohesion: 0.12
Nodes (29): InventoryDialogProps, UniverseId, InventoryItem, ItemModifier, readItemModifiers(), readItemSlot(), StatDefinition, GmLootItem (+21 more)

### Community 52 - "Illusionist Portrait"
Cohesion: 0.14
Nodes (15): Light Blue Spiral at Raised Fingertip, Two Curved Head Stalks, One Pale and One Orange, Gold Armbands and Wrist Cuffs, Teal Collar and Gold Medallion with Blue Gem, Uncertain Head-Stalk Type, Possible Heart-Shaped Tail Tip, Illusionist, Leader (+7 more)

### Community 53 - "Jailor Portrait"
Cohesion: 0.13
Nodes (15): Jailor character art, Black backdrop, Light-blue skin, Light-blue octopus head, Arms crossed over the chest, Dark pointed boots, Glowing pink chain coiled around the body, Gold bands on arms and tentacles (+7 more)

### Community 54 - "Tactician Portrait"
Cohesion: 0.26
Nodes (14): Solid black surrounding field, Conical cream hat with orange pattern, Folk and stage costume styling, Gold hoop earrings, Half-lidded eyes with purple shading, White robes with teal and red, Leader, Dark fan banner with gold mask (+6 more)

### Community 55 - "Wisp Portrait"
Cohesion: 0.21
Nodes (14): Basal flame ring, Black surrounding field, Cartoon face with pink cheeks and small mouth, Prominent circular eye, Cyan spectral flame envelope, Floating posture, Navy, magenta, and cyan palette, Navy spherical chassis (+6 more)

### Community 56 - "Port Test Checklist"
Cohesion: 0.19
Nodes (15): Acrobat, AcrobatLegalActionsTest, Leader, LegalActionsResolverEdgeCasesTest, Manipulator, ManipulatorLegalActionsTest, Nemesis, NemesisResolutionTest (+7 more)

### Community 57 - "host-gm-prompt.ts"
Cohesion: 0.09
Nodes (17): characterIdentity(), CARRIED_MAX, ENCOUNTER_NAME_MAX, GmIntent, LOCATION_MAX, preferredCheckDifficulty(), SETUP_MAX, charactersForGm() (+9 more)

### Community 58 - "Dashboard Game List"
Cohesion: 0.25
Nodes (4): destination, reserved, sync, title

### Community 59 - "P2P Module Map"
Cohesion: 0.23
Nodes (13): common/p2p, leaders/app, Leaders P2P Client, openMesh, room-connection.ts, common/, Leaders Game, Leaders Routes (+5 more)

### Community 60 - "campaign-settings-import-export.ts"
Cohesion: 0.17
Nodes (21): CampaignSettingsInput, CAMPAIGN_SETTINGS_EXPORT_VERSION, CAMPAIGN_SETTINGS_EXPORT_VERSION_V1, CampaignTabSettingsExport, Check, ImportedNewCampaignSettings, isRecord(), NewCampaignSettingsExport (+13 more)

### Community 61 - "game.types.ts"
Cohesion: 0.22
Nodes (6): ActionChoiceOverlayProps, GAME_COMMAND_REJECTION_CODES, GameCommandRejectionView, GameLegalAction, GameLegalActionType, ReadyRequest

### Community 62 - "Assassin Portrait"
Cohesion: 0.19
Nodes (13): Assassin, Assassin character art, Chest strap, Curved blade, Dark lower garment, Glowing magenta eyes, Hunched pose, Obscured face (+5 more)

### Community 63 - "Nemesis Portrait"
Cohesion: 0.18
Nodes (13): Solid black background, Clawed limb, Dark plated armor, Glowing red torso, Leader, Nemesis, Spiked orb staff, Nemesis portrait (+5 more)

### Community 64 - "Route Sync Script"
Cohesion: 0.22
Nodes (12): appGameDir, expected, exportsMetadata(), gameSlugs(), isUseClient(), pruneEmptyDirs(), readManifest(), root (+4 more)

### Community 65 - "Game Manifest"
Cohesion: 0.18
Nodes (8): games, GameManifest, description, kind, title, description, kind, title

### Community 66 - "Action Phase Rules"
Cohesion: 0.28
Nodes (9): Action Phase, CharacterLegalActionsTest, End Action Phase, GameRulesEngineTests, Legal Actions, LegalActionsResolverTest, Recruit, Shaman (+1 more)

### Community 67 - "Capture Timing Docs"
Cohesion: 0.23
Nodes (12): After Nemesis, Archer, Assassin, Capture, CaptureEvaluatorTest, End of Full Turn, GameRulesEngineWinTest, Second-Player Compensation (+4 more)

### Community 68 - "game-view-model.ts"
Cohesion: 0.31
Nodes (12): PlayerHandRow(), activeCardSlotsForColor(), ActiveCardSlotSource, boardPiecesForOwner(), findLeaderPiece(), handForColor(), isActiveCardSlotFlippedForAction(), isHandCardFlippedForAction() (+4 more)

### Community 69 - "Claw Launcher Portrait"
Cohesion: 0.18
Nodes (11): Open mouth with bared teeth, Black backdrop, Bold cartoon rendering, Claw Launcher, Round hip canister, Leader character, Oversized orange mechanical launcher, Orange armor over a dark suit (+3 more)

### Community 70 - "Cub Portrait"
Cohesion: 0.17
Nodes (12): Bipedal bear cub, Black claws, Cub character art, Cream muzzle, chest, and belly, Cub, Leaders character, Magenta markings, Orange-gold fur (+4 more)

### Community 71 - "Frog Portrait"
Cohesion: 0.17
Nodes (12): Frog character portrait, Blue base may be a water splash or stylized webbed feet, Bright blue feet merging into a wavy splash-shaped base, Frog, Glossy rounded cartoon shading, Small orange oval markings on the upper chest, Pink tuft projecting from the viewer's left side of the head, Plain white background (+4 more)

### Community 72 - "App Route Types"
Cohesion: 0.17
Nodes (11): AppRoutes, LayoutProps, LayoutRoutes, LayoutSlotMap, PageProps, PageRoutes, ParamMap, ParamsOf (+3 more)

### Community 73 - "app/room/[code]/game/page.tsx"
Cohesion: 0.14
Nodes (16): metadata, PlayPage(), GameLoadingSpinner(), GamePage(), RoomPage(), GameEndActions(), GameEndActionsProps, HexBackdrop() (+8 more)

### Community 74 - "inventory-dialog.tsx"
Cohesion: 0.27
Nodes (9): InventoryDialog(), ItemList(), formatItemSlotLabel(), formatModifier(), formatModifierList(), formatRaceDetail(), itemModifierBonuses(), itemModifierMaluses() (+1 more)

### Community 75 - "Lobby Panel Rows"
Cohesion: 0.40
Nodes (9): ConnectionDot(), LobbyLoadingSpinner(), memberConnectionConnected(), MemberName(), PlayerRow(), ReadyCheckIcon(), ReadyCrossIcon(), ReadyToggle() (+1 more)

### Community 76 - "Leaders Card Art"
Cohesion: 0.24
Nodes (10): Leaders portrait, Right-weighted cartoon bust, Stern crowned man, Gold crown with tall points, Black or transparent ground, Black handlebar mustache, Dashboard leader avatar, Purple glove on a raised teal weapon (+2 more)

### Community 77 - "Project Readme"
Cohesion: 0.28
Nodes (9): Next.js Dist Docs, Next.js Agent Rules, App URL Shell, Awesome Games, create-game, Dashboard, Game Manifest, public/ (+1 more)

### Community 78 - "character-tab-config.ts"
Cohesion: 0.16
Nodes (18): optionsDraftWithPools(), readCharacterStep(), SETTING_LEVELS, Check, DEATH_RECOVERY_OPTIONS, DeathRecoveryId, EQUIPMENT_VALIDATION_RULES, EquipmentValidationRuleId (+10 more)

### Community 79 - "Game State Views"
Cohesion: 0.21
Nodes (12): actionKey, BoardPiece, GameActionKeyTest, Game Command, GameLegalAction, GameStateView, GameStateViewJsonSerializationTest, GameWsExceptionHandlerTest (+4 more)

### Community 80 - "legal-actions.ts"
Cohesion: 0.29
Nodes (15): activeCandidateParams(), allCellParams(), clawCandidates(), neighborIds(), enemyJailorAdjacent(), findPieceOfType(), piecesOf(), accept() (+7 more)

### Community 81 - "Rules Engine Contract"
Cohesion: 0.22
Nodes (13): Board Topology, BoardTopologyTests, Peer Consensus, Fixed Host and Guest Colors, GameRulesEngine, GameStateFactory, LegalActionsResolver, Move Log (+5 more)

### Community 82 - "mesh.ts"
Cohesion: 0.31
Nodes (5): MeshError, OpenMeshOptions, RELAY_UNREACHABLE, relaySockets(), waitForRelay()

### Community 83 - "host-gm-turn.ts"
Cohesion: 0.20
Nodes (18): GmBeat, GmReaction, markGmUnreadable(), buildGmOutcomeRetryMessage(), buildGmOutcomeUserMessage(), buildGmReactionRetryMessage(), buildGmReactionUserMessage(), turnVars() (+10 more)

### Community 84 - "campaign-play.tsx"
Cohesion: 0.17
Nodes (12): metadata, RpgCampaignPage(), AgentLog(), BinIcon(), CampaignPlay(), CampaignPlayProps, GmBusyIndicator(), LogEntry() (+4 more)

### Community 85 - "rules.test.ts"
Cohesion: 0.15
Nodes (19): leaders/domain, cellAt(), board(), StaleVersionException, ValidationException, at(), command(), emptyState() (+11 more)

### Community 86 - "Client Port Contract"
Cohesion: 0.50
Nodes (4): P2P Client Port Contract, Project Design Note, Infrastructure Kept Off the Client, Server Transport

### Community 91 - "CampaignSettings"
Cohesion: 0.27
Nodes (10): CampaignSettings, CampaignConfiguration, SettingLevel, CharacterConfiguration, TableCharacter, LobbySave, HostSession, TableSnapshot (+2 more)

### Community 93 - "Protector"
Cohesion: 0.22
Nodes (9): Global Ability Gates, Bruiser, BruiserPushLegalActionsTest, Claw Launcher, Illusionist, Jailor, Protector, Wanderer (+1 more)

### Community 94 - "characterOptionsFor"
Cohesion: 1.00
Nodes (3): characterOptionsFor(), cloneCharacterOptions(), resolveCharacterOptions()

### Community 95 - "eslint.config.mjs"
Cohesion: 0.33
Nodes (5): eslintConfig, eslint@^9, eslint-config-next@16.2.1, eslint, eslint-config-next

### Community 96 - "rpg/paths.ts"
Cohesion: 0.36
Nodes (5): gameHomePath(), listGames(), dashboardArtSrc(), DashboardPage(), home

### Community 97 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, next@16.2.1, react@19.2.4, react-dom@19.2.4, trystero@^0.26.0, trystero

### Community 98 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, create-game, dev, lint, start

### Community 99 - "host-situation.ts"
Cohesion: 0.19
Nodes (21): gmLanguageLabel(), buildGmSystemPrompt(), buildOpeningSituationRetryMessage(), buildOpeningSituationUserMessage(), campaignVars(), requestOutcome(), callHostChat(), isRecord() (+13 more)

### Community 100 - "CharacterOptions"
Cohesion: 0.53
Nodes (5): StatsDialog(), StatsDialogProps, CharacterOptions, characterRollModifierSummary(), characterStatRows()

## Ambiguous Edges - Review These
- `Possible transparent background` → `Solid black surrounding field`  [AMBIGUOUS]
  public/leaders/characters/royal_guard.png · relation: conceptually_related_to
- `Poleaxe or halberd` → `Golden long-hafted axe`  [AMBIGUOUS]
  public/leaders/characters/royal_guard.png · relation: conceptually_related_to
- `Green eye emblem` → `Marks flanking the eye`  [AMBIGUOUS]
  public/leaders/characters/vizier.png · relation: conceptually_related_to
- `Plain dark backdrop` → `Vizier character art`  [AMBIGUOUS]
  public/leaders/characters/vizier.png · relation: conceptually_related_to
- `Solid black surrounding field` → `tactician.png`  [AMBIGUOUS]
  public/leaders/characters/tactician.png · relation: references
- `Possible creature mount` → `Red seat with gold-tipped spikes`  [AMBIGUOUS]
  public/leaders/characters/tactician.png · relation: conceptually_related_to
- `Hermit` → `Seated pose`  [AMBIGUOUS]
  public/leaders/characters/hermit.png · relation: conceptually_related_to
- `Magenta leg markings` → `Painted or tattooed leg marks`  [AMBIGUOUS]
  public/leaders/characters/hermit.png · relation: conceptually_related_to
- `Transparent background` → `hermit.png`  [AMBIGUOUS]
  public/leaders/characters/hermit.png · relation: conceptually_related_to
- `Black lower rifle section` → `Rifle magazine`  [AMBIGUOUS]
  public/leaders/characters/sniper.png · relation: conceptually_related_to
- `Green T-shaped muzzle fitting` → `Muzzle device or front sight`  [AMBIGUOUS]
  public/leaders/characters/sniper.png · relation: conceptually_related_to
- `Hip pouch` → `Orange hip plate`  [AMBIGUOUS]
  public/leaders/characters/sniper.png · relation: conceptually_related_to
- `Pale curved rear appendages` → `White fluffy mane`  [AMBIGUOUS]
  public/leaders/characters/sniper.png · relation: conceptually_related_to
- `Uniform black backdrop` → `Character illustration`  [AMBIGUOUS]
  public/leaders/characters/sniper.png · relation: conceptually_related_to
- `Brown belt with a large round gold buckle` → `Unread embossed mark on the gold buckle`  [AMBIGUOUS]
  public/leaders/characters/leader.png · relation: conceptually_related_to
- `Pale shoulder trim, fur or light cloth` → `Open cream cape hanging from the shoulders`  [AMBIGUOUS]
  public/leaders/characters/leader.png · relation: conceptually_related_to
- `Dark footwear at the feet` → `Leader`  [AMBIGUOUS]
  public/leaders/characters/leader.png · relation: conceptually_related_to
- `Black backdrop` → `bruiser.png`  [AMBIGUOUS]
  public/leaders/characters/bruiser.png · relation: references
- `Unclear buckle relief` → `Ornate gold belt buckle`  [AMBIGUOUS]
  public/leaders/characters/bruiser.png · relation: conceptually_related_to
- `Dark planted feet` → `Bruiser`  [AMBIGUOUS]
  public/leaders/characters/bruiser.png · relation: conceptually_related_to
- `Near-black featureless face` → `Possible shadow or mask visage`  [AMBIGUOUS]
  public/leaders/characters/manipulator.png · relation: conceptually_related_to
- `Large dark purple rounded mass` → `Uncertain orb, sleeve, or cloak`  [AMBIGUOUS]
  public/leaders/characters/manipulator.png · relation: conceptually_related_to
- `Small coral-pink floating shapes` → `Possible petals or ribbon scraps`  [AMBIGUOUS]
  public/leaders/characters/manipulator.png · relation: conceptually_related_to
- `Dark point under the hem` → `Manipulator`  [AMBIGUOUS]
  public/leaders/characters/manipulator.png · relation: conceptually_related_to
- `Human as the shaman` → `Small human figure`  [AMBIGUOUS]
  public/leaders/characters/shaman.png · relation: conceptually_related_to
- `Human as the shaman` → `Shaman`  [AMBIGUOUS]
  public/leaders/characters/shaman.png · relation: conceptually_related_to
- `Ceremonial mask` → `Green face`  [AMBIGUOUS]
  public/leaders/characters/shaman.png · relation: conceptually_related_to
- `Creature as the shaman` → `Large orange-maned creature`  [AMBIGUOUS]
  public/leaders/characters/shaman.png · relation: conceptually_related_to
- `Creature as the shaman` → `Shaman`  [AMBIGUOUS]
  public/leaders/characters/shaman.png · relation: conceptually_related_to
- `Small human figure` → `Red staff with green wrap`  [AMBIGUOUS]
  public/leaders/characters/shaman.png · relation: conceptually_related_to
- `Pink bat wings` → `Short snout`  [AMBIGUOUS]
  public/leaders/characters/wanderer.png · relation: conceptually_related_to
- `Crescent buckle mark` → `Round belt buckle`  [AMBIGUOUS]
  public/leaders/characters/wanderer.png · relation: conceptually_related_to
- `Plain black backdrop` → `Transparent cutout`  [AMBIGUOUS]
  public/leaders/characters/wanderer.png · relation: conceptually_related_to
- `Female-presenting archer` → `Dark handwear`  [AMBIGUOUS]
  public/leaders/characters/archer.png · relation: conceptually_related_to
- `Black surrounding field` → `Archer character art`  [AMBIGUOUS]
  public/leaders/characters/archer.png · relation: conceptually_related_to
- `Curled cranial appendages` → `Horns or antennae`  [AMBIGUOUS]
  public/leaders/characters/rider.png · relation: semantically_similar_to
- `Solid black field` → `Rider character art`  [AMBIGUOUS]
  public/leaders/characters/rider.png · relation: references
- `Pale spotted big cat` → `Snow leopard or pale lioness`  [AMBIGUOUS]
  public/leaders/characters/rider.png · relation: semantically_similar_to
- `Teal flowing appendages` → `Tentacles, fins, or cloak`  [AMBIGUOUS]
  public/leaders/characters/rider.png · relation: semantically_similar_to
- `Possible transparent background` → `acrobat.png`  [AMBIGUOUS]
  public/leaders/characters/acrobat.png · relation: references
- `Hair bun or carried sack` → `Large gray rounded mass behind the head`  [AMBIGUOUS]
  public/leaders/characters/brew_master.png · relation: conceptually_related_to
- `Possible ladle, key, or tap` → `Small golden object in the raised hand`  [AMBIGUOUS]
  public/leaders/characters/brew_master.png · relation: conceptually_related_to
- `Nested bird` → `Orange avian visage`  [AMBIGUOUS]
  public/leaders/characters/protector.png · relation: conceptually_related_to
- `Pale marks on lower bark` → `Shelf fungi`  [AMBIGUOUS]
  public/leaders/characters/protector.png · relation: conceptually_related_to
- `Two Curved Head Stalks, One Pale and One Orange` → `Uncertain Head-Stalk Type`  [AMBIGUOUS]
  public/leaders/characters/illusionist.png · relation: conceptually_related_to
- `Possible Heart-Shaped Tail Tip` → `Pink Banded Segmented Tail with Curled Fluke`  [AMBIGUOUS]
  public/leaders/characters/illusionist.png · relation: conceptually_related_to
- `Black backdrop` → `Jailor character art`  [AMBIGUOUS]
  public/leaders/characters/jailor.png · relation: conceptually_related_to
- `Jailor` → `Feet-together suspended stance`  [AMBIGUOUS]
  public/leaders/characters/jailor.png · relation: conceptually_related_to
- `Black surrounding field` → `will-o-the-wisp.png`  [AMBIGUOUS]
  public/leaders/characters/will-o-the-wisp.png · relation: references
- `Upper ring as second eye or sensor` → `Small outlined circle above the eye`  [AMBIGUOUS]
  public/leaders/characters/will-o-the-wisp.png · relation: conceptually_related_to
- `Assassin` → `Orange cloak mark`  [AMBIGUOUS]
  public/leaders/characters/assassin.png · relation: conceptually_related_to
- `Chest strap` → `Star-shaped pendant`  [AMBIGUOUS]
  public/leaders/characters/assassin.png · relation: conceptually_related_to
- `Black backdrop` → `claw_launcher.png`  [AMBIGUOUS]
  public/leaders/characters/claw_launcher.png · relation: conceptually_related_to
- `Solid black field` → `Cub character art`  [AMBIGUOUS]
  public/leaders/characters/cub.png · relation: conceptually_related_to
- `Blue base may be a water splash or stylized webbed feet` → `Bright blue feet merging into a wavy splash-shaped base`  [AMBIGUOUS]
  public/leaders/characters/frog.png · relation: conceptually_related_to
- `Pink tuft projecting from the viewer's left side of the head` → `Pink head tuft may be feathers, petals, or a fin`  [AMBIGUOUS]
  public/leaders/characters/frog.png · relation: conceptually_related_to
- `Black or transparent ground` → `Leaders portrait`  [AMBIGUOUS]
  public/dashboard/leaders.png · relation: conceptually_related_to
- `Purple glove on a raised teal weapon` → `Sword or staff`  [AMBIGUOUS]
  public/dashboard/leaders.png · relation: conceptually_related_to

## Knowledge Gaps
- **253 isolated node(s):** `unstable_cacheTag`, `unstable_cacheLife`, `Possible transparent background`, `Poleaxe or halberd`, `Cel-shaded cartoon rendering` (+248 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 566 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `rpg/services/room-connection.ts`, `Legal Action Overlay`, `Ability Hover Tooltip`, `Host AI Providers`, `Win Condition Tracking`, `Hex Board Rendering`, `New Campaign State`, `use-game-realtime.ts`, `use-game-realtime.ts`, `room-code.ts`, `new-campaign-form.tsx`, `package.json`, `team-options.tsx`, `use-play.ts`, `character-form.tsx`, `game-view-model.ts`, `app/room/[code]/game/page.tsx`, `inventory-dialog.tsx`, `campaign-play.tsx`, `dependencies`?**
  _High betweenness centrality (0.175) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `useNewCampaign()` (e.g. with `back()` and `goToStep()`) actually correct?**
  _`useNewCampaign()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `unstable_cacheTag`, `unstable_cacheLife`, `Possible transparent background` to the rest of the system?**
  _253 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `character-options.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11806543385490754 - nodes in this community are weakly interconnected._
- **Why does `next` connect `react` to `rpg/paths.ts`, `dependencies`, `Legal Action Overlay`, `Ability Hover Tooltip`, `new-campaign-form.tsx`, `Host AI Providers`, `app/room/[code]/game/page.tsx`, `package.json`, `use-play.ts`, `Root Layout`, `New Campaign State`, `character-form.tsx`, `campaign-play.tsx`, `room-code.ts`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `Possible transparent background` and `Solid black surrounding field`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Poleaxe or halberd` and `Golden long-hafted axe`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._