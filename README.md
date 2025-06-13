# pope-game
A browser-based platform game designed with AI

Core Gameplay Questions
	1	What is your player character?
	⁃	The main character is a priest, who goes through levels collecting upgrades and promotions to become Pope. Each level he should gain a new outfit (sprite will change) and ability (double jump, shooting projectile, etc). These are permanent abilities.
	⁃	Friar - Jump
	⁃	Bishop - Double Jump
	⁃	Archbishop - Front Attack
	⁃	Cardinal - Projectile Attack
	⁃	Pope - Additional powers like temporary flight
	2	What is the main goal?
	⁃	The goal of each level will be to reach the end of the level.
	⁃	There will be “boss levels” where the goal is to defeat the boss.
	3	How does the player lose?
	⁃	The player will take enough damage to lose their life. They will be damaged by hazards (like spike tiles), enemies, and projectiles (from enemies or from the environment).
	4	What makes your game unique?
	⁃	The game is unique because it’s mine.
	⁃	The theme is unusual.
Level & World Questions
	5	How many levels do you want?
	⁃	Let’s start with 5. Peru, Chicago 1, Chicago 2, Conclave, Ossuary
	6	What are your two worlds?
	⁃	The levels will have different tile sets. Peru is a macchu pichu jungle mountain, Chicago is an urban environment.
	7	What obstacles/challenges will players face?
	⁃	Jumping gaps, Moving platforms, Enemies, Puzzles, collectibles, boss enemies.
Technical/Scope Questions
	8	What are the power-ups?
	⁃	Pope blood - increased abilities (haven’t decided yet); Leaves - Speed boost, jump increased (15 seconds); Wine/Beer - Invincibility (15 seconds); Holy Water - Shoot 10 projectiles
	8	Do you want a score system?
	⁃	Yes (Points for collecting tithes (coins, etc)? There will be a time bonus and enemy defeats bonus. There will also be items you can collect for your collection.
	9	What's your "minimum playable game"?
	⁃	I would be happy with basic sprites and one long level that is fun to play.

Revised Phase 1:
	1	index.html - Working title is “pope game”
	2	main.css - Style it with religious/ceremonial colors: light blue, red and cream white.
	3	main.js - Draw a simple priest rectangle first

Let's start with player.js
Before I write it, a few quick questions:
	1	Movement Speed - How fast should your priest move?
	◦	The priest needs to be responsive, but since we’re going to have a power up to go even faster, it should be mid-way between medium and fast.
	2	Jump Height - How high should a single jump go?
	◦	Let’s start with 1.5x player height. But let’s keep in mind that upgrades to the character will make higher jumps and double jumps possible.
	3	Controls - Which do you prefer?
	◦	Both arrow keys and WASD
	◦	Let’s use the spacebar for shooting projectiles.
	4	Jump Style - Should the player be able to:
	◦	Wall jump later (Jump only when on the ground or a platform for now)
	◦	Double jump later (but single for now)
	◦	The player should jump higher/further if running at full speed
	◦	Let’s include a “coyote” jump feature
	5	Momentum - How should movement feel?
	◦	Slight sliding when stopping (more realistic)
	7	Air Control - Can the player change direction mid-jump?
	◦	Full control (can completely reverse in air)
	8	Sprite Facing - Should we track which way the priest faces?
	◦	Yes, for future sprite flipping — show it with an eye (facing forward)
	9	State Tracking - What player states should we track?
	◦	Full state machine (idle, long idle, walking, jumping, falling, taking damage, dying, front flip (on double jump or enemy bounce))
	10	Velocity-based movementUse  speedX/speedY variables rather than directly changing position
Rectangular collision - Using simple box collision (not pixel-perfect although we may use it in special situations later)
	12	Fixed hitbox - The 32x64 rectangle is the actual collision size
	13	Update pattern - player.js will have update() and draw() functions called from main.js
	14	Ground level - For now, ground is always at y = 580 (canvas.height - 60), but in the future, levels might be increasing in altitude or decreasing by situation.

https://jakegunst.github.io/pope-game/

Before I write physics.js, let me ask a few quick questions:
	1	Gravity strength - Current gravity (0.5) feels:
	◦	Too floaty - fall slightly faster
	2	Terminal velocity - Should there be a maximum fall speed?
	◦	Yes (prevents super fast falling)
	3	Jump control - Please make all jumps same height for now. Can we remove the standstill vs full speed jump height difference? Playing with the character, that idea I had doesn’t feel great in practice.
	4	Future physics - Planning these:
	◦	Swimming/water areas
	◦	Low gravity areas
	◦	Wind or conveyor belts
	◦	Bouncy surfaces
Wall interactions - When the player hits a wall while jumping:
	•	Slide down slowly (wall slide for future wall jump)
Slope handling - For slanted platforms later:
	•	Player slides down slopes
	•	Player walks up slightly slower, and down slightly faster
	•	Different physics on ice slopes vs normal slopes? Probably, but I don’t have a plan to use this right now.
Moving platform behavior - When standing on moving platforms:
	•	Player inherits platform momentum (moves with it automatically)
	•	Sticky feet (can't fall off while standing)
Edge behavior - When player reaches platform edges:
	•	Player should be able to balance on the very edge (only center needs to be on platform)
	•	Special "teetering" animation when close to edge would be cool
Feedback on current feel:
	•	Current gravity (0.5) - Falling should be slightly faster
	•	Current jump power (-12) - Jump is a little too high, let’s lower it
	•	Current max speed (5) - Not fast enough, make it quicker
	•	Current acceleration (0.5) - Too sluggish

Before I write collision-detection.js, quick questions:
	1	Collision precision - For platform edges:
	◦	Generous (can grab edges slightly)
	2	Platform types - Planning to have:
	◦	Solid platforms, One-way platforms (jump through from below), crumbling platforms (fall after being stood on), bouncy platforms, VERY bouncy platforms and there should be various types of Moving platforms
	1	Collision response - When hitting a wall mid-air:
	◦	Slide down (we have this in physics already)
	2	Debug visuals - Want to see collision boxes?
	◦	Yes, always show them
	5	Slope collisions - When implementing angled platforms:
	◦	What's the steepest walkable angle? 60°
	◦	Should different angles affect walk speed? yes
	◦	Can the player slide down if too steep? Yes
	6	Moving platform variants - What types do you want?
	◦	platform_r_slow (horizontal-right, slow)
	◦	platform_r_fast (horizontal-right, fast)
	◦	platform_l_slow (horizontal-left, slow)
	◦	platform_l_fast (horizontal-left, fast)
	◦	platform_u_slow (vertical-up, slow)
	◦	platform_u_fast (vertical-up, fast)
	◦	platform_d_slow (vertical-down, slow)
	◦	platform_d_fast (vertical-down, fast)
	◦	platform_ur_slow (diagonal-up-right, slow)
	◦	platform_ur_fast (diagonal-up-right, fast)
	◦	platform_dr_slow (diagonal-down-right, slow)
	◦	platform_dr_fast (diagonal-down-right, fast)
	◦	platform_ul_slow (diagonal-up-left, slow)
	◦	platform_ul_fast (diagonal-up-left, fast)
	◦	platform_dl_slow (diagonal-down-left, slow)
	◦	platform_dl_fast (diagonal-down-left, fast)
	◦	platform_cw_circle (clockwise circular path)
	◦	platform_ccw_circle (counterclockwise circular path)
	◦	four_platform_cw_circle (four platforms moving together in a clockwise circular path around a shared center)
	◦	four_platform_ccw_circle (four platforms moving together in a counterclockwise circular path around a shared center)
	◦	platform_falling_timed
	◦	platform_spin_clockwise (spins around its own center so that the player falls off when the angle gets too high)
	◦	platform_spin_counterclockwise (spins around its own center so that the player falls off when the angle gets too high)
	◦	platform_balance (platform that tilts on it’s axis under the players weight and position - faster further from the center/slower towards the center/not at all if perfectly balanced)
	◦	platform_balance_little (little platform that tilts on it’s axis under the players weight and position - faster further from the center/slower towards the center/not at all if perfectly balanced)
	◦	platform_balance_big (big platform that tilts on it’s axis under the players weight and position - faster further from the center/slower towards the center/not at all if perfectly balanced)
	◦	bouncy_platform
	◦	super_bouncy_platform
	◦	bouncy_platform_little
	◦	super_bouncy_platform_little
	◦	bouncy_platform_big
	◦	super_bouncy_platform_big
	8	Collision layers - Certain things should ignore each other
	◦	The player collides with everything, but flying enemies ignore platform collisions, ghost enemies ignore all collisions except ground and player
	◦	floating coins and power-ups can ignore all platforms, but non-floating coins and power-ups cannot
	9	Corner correction - If player barely clips a platform corner:
	◦	Push them to nearest safe spot/Auto-climb if very small (2 pixels)
	10	Collision callbacks - When collisions happen, trigger:
	◦	Sound effects per collision type
	◦	Particle effects (dust when landing)
	◦	Screen shake for hard impacts
	◦	Special events (touching a switch)
	11	Performance optimization - For many platforms:
	◦	Check only nearby platforms (spatial partitioning)

Phase 3 questions

	1	Level format - How do you want to design levels?
	◦	Mix of grid-based and pixel-perfect
	2	Level size - How big should levels be?
	◦	Scrolling both ways (like Metroid)
	3	Tile size - For your tilesets:
	◦	32x32 pixels
	4	Level editor - Want to:
	◦	I want to try to hand-write JSON (more control)
	◦	but later I would like to use Tiled — can we prepare for that eventuality now?
Level goals - How does a player complete a level?
	•	Depending on the level, it could be either:
	•	Reach a specific location (door/flag)
	•	Collect all items then reach exit
	•	Defeat all enemies
	•	Time-based challenge
Checkpoints - When player dies:
	•	Respawn at checkpoints
	•	Keep some progress (coins collected)
Background layers - Want parallax scrolling?
	•	Yes! Multiple layers moving at different speeds and Animated backgrounds (clouds, birds)
Level transitions - Between levels:
	•	Show score/stats screen
	•	Cutscene or story text
Collectibles - What appears in levels?
	•	Coins/tithes (for score)
	•	Power-ups (temporary abilities)?
	•	Treasure (items that are added to your collection)
	•	Permanent upgrades?
	•	Hidden secrets?
	•	projectile restocks (holy water)
	•	magic power (pope blood)
	•	weapons (to add or increase attack options)
Level data - What else to store per level?
	•	Background music track
	•	Boss enemy music track
	•	Ambient sounds
	•	Weather effects
	•	Gravity modifications
	•	Time limits

Before writing game-engine.js, quick questions:

1. Camera system - How should the view follow the player?

Centered on player, Smooth following with slight lag

2. Level boundaries - What happens at level edges?

Hard stop at edges, Kill player if they fall off bottom

3. HUD display - What info should always be visible?

Top left corner:
# Lives
% health
Tithe (coins)

Top right corner:
Current power-ups
# pope blood  (able to be hidden depending on the level)
% holy water  (able to be hidden depending on the level)

Bottom right corner:
Score
Timer (able to be hidden depending on the level)

4. Pause functionality - Want to add:

Pause with P
Pause menu with options

5. Death/Respawn - When the player dies:

Death animation first (falling, fading), then respawn at checkpoint
"Lives" system (game over after X deaths)

6. Screen transitions - When moving between areas/screens:

Smooth scroll to new area, sometimes Special transition effects (iris wipe, etc)

7. Performance optimization - For large levels:
	•	Render only what's visible on screen (plus small buffer zone)
	•	Chunk loading system - divide levels into 512x512 pixel sections, load/unload as player moves
	•	Simple LOD for decorations and particles (less detail for distant objects)

8. Debug features - Developer tools:

Free camera mode (fly around level)
God mode (invincibility)
Level skip buttons
Show FPS/performance stats
Spawn enemies/items on click

9. Save system - Progress saving:

Auto-save at checkpoints
Save current level progress
Save inventory/upgrades between sessions
Multiple save slots


10. Game states - Different modes to handle:

Main menu state?
Level select screen?
Cutscene/dialogue state?
Boss fight state (different camera)?
Victory/game over screens?

=======

1. Camera system - How should the view follow the player?

Always centered on player?
Dead zone (only move camera when player near edge)?
Smooth following with slight lag?


2. Level boundaries - What happens at level edges?

Hard stop at edges?
Kill player if they fall off bottom?
Wrap around (appear on other side)?


3. HUD display - What info should always be visible?

Lives/health?
Score/coins?
Timer?
Current power-ups?


4. Pause functionality - Want to add:

Pause with P or Escape key?
Pause menu with options?
Just freeze everything?

5. Death/Respawn - When the player dies:

Instant respawn at checkpoint?
Death animation first (falling, fading)?
"Lives" system (game over after X deaths)?
Respawn delay/button press?


6. Screen transitions - When moving between areas/screens:

Smooth scroll to new area?
Fade out/fade in?
Instant snap?
Special transition effects (iris wipe, etc)?


7. Performance optimization - For large levels:

Only render what's on screen?
LOD system (less detail far away)?
Chunk loading (load level in sections)?


8. Debug features - Developer tools:

Free camera mode (fly around level)?
God mode (invincibility)?
Level skip buttons?
Show FPS/performance stats?
Spawn enemies/items on click?


9. Save system - Progress saving:

Auto-save at checkpoints?
Save current level progress?
Save inventory/upgrades between sessions?
Multiple save slots?


10. Game states - Different modes to handle:

Main menu state
Level select screen
Cutscene/dialogue state
Boss fight state (different camera)
Victory/game over screens

=====
June 12th status report:
Current Issues:

Platform Rendering Bug - Platforms show as 1024 pixels tall instead of 32! (see console: "Platform at 0,576 size 1600x1024")
Enemy Stomping - Inconsistent stomp detection, needs better collision timing
Enemies Fall Through Platforms - They collide with ground (y:576) but not other platforms

What's Working:
Game loads and runs
Player movement and jumping
Holy water projectiles
Enemy spawning and basic AI
Camera following (horizontal and vertical)
Victory/game over screens

Recently Fixed:
Enemy manager now finds platforms correctly
Basic enemy-platform collision works for ground
=====















