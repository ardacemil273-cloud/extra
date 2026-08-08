# Phase 7 — 3 Cozy Girl-Favorite Games

## Farm Together (Hay Day style) ✅
- [x] Backend: farm-together module + service (8x8 grid, crops 30/60/120s, plant/water/harvest/sell, 1000 coins / 5min, server authoritative)
- [x] Backend: gateway socket handlers (farm:plant, farm:water, farm:harvest, farm:sell, farm:state-update)
- [x] Frontend: FarmTogetherGame component (cute isometric grid, drag seeds, water animation, coin counter, splash)
- [x] XP reward + DB save at game over

## Fashion Star (Dress to Impress style) ✅
- [x] Backend: fashion-star module + service (3 themes, 60s dress, runway 1-5 star voting, no self-vote, podium)
- [x] Backend: gateway socket handlers (fashion:pick-item, fashion:submit-look, fashion:vote, fashion:round-result)
- [x] Frontend: FashionStarGame component (wardrobe left, avatar preview right, runway fullscreen voting, podium+confetti)
- [x] XP reward + DB save at game over

## Cafe Rush (Overcooked cute) ✅
- [x] Backend: cafe-rush module + service (orders every 15s, chop/bake/mix, 30s expiry, 15 orders win in 4min)
- [x] Backend: gateway socket handlers (cafe:action)
- [x] Frontend: CafeRushGame component (order tickets conveyor top, stations middle, inventory bottom, avatars)
- [x] XP reward + DB save at game over

## General / Wiring ✅
- [x] Update GAME_TYPES in types/index.ts (vampire, farm-together, fashion-star, cafe-rush, barbie-dreamhouse)
- [x] Host selects game type in lobby (GAME_TYPES drives it)
- [x] Refactor game/[roomId]/page.tsx into dispatcher; move vampire UI to components/games/vampire-village
- [x] Rules modal before start (all games)
- [x] Mobile responsive, pastel cute UI, sounds
- [x] Build PASS (backend ts + frontend ts)

# Phase 8 — Barbie Dreamhouse Dress-Up (FINAL) ✅
- [x] Backend: barbie-dressup module + service (5 themes, 50+ wardrobe items, 60s dress, Barbie box reveal, runway 1-5 star voting, no self-vote, podium + "Barbie of the Year")
- [x] Backend: gateway socket handlers (barbie:pick-item, barbie:makeup, barbie:submit-look, barbie:vote, barbie:result) + game:start routing
- [x] Backend: extended GamePhase union with BOX_REVEAL
- [x] Frontend: BarbieDressupGame component (ultra-pink Dreamhouse UI, dream closet categories, giant Barbie box avatar with 360 spin, makeup, glitter sparkles, runway fullscreen voting, confetti)
- [x] Frontend: GAME_TYPES entry (barbie-dreamhouse, 💖👛) + BarbieState/BarbieItem/BarbieTheme types
- [x] Frontend: dispatcher routing for barbie-dreamhouse
- [x] XP reward + DB save at game over (winner gets 200xp + "Barbie of the Year")
- [x] Build PASS (backend ts + frontend ts)
