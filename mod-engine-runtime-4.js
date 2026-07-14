function callCommand(payload){
        if(payload == null) return;
        var cmd = String(payload.command);
        if(cmd == null) return;

        if(cmd === "settings" || cmd === "preferences"){
            try{ Vars.ui.settings.show(); }catch(e){ notify("SETTINGS OPEN FAILED"); }
            return;
        }
        if(cmd === "clearMap"){
            killBuildings(function(build){ return enemyFilterBuilding(build); });
            killUnits(function(unit){ return enemyFilterUnit(unit); });
            notify("MAP CLEARED");
            return;
        }
        if(cmd === "instantBuild"){
            Vars.state.rules.instantBuild = !Vars.state.rules.instantBuild;
            Vars.state.rules.buildSpeedMultiplier = Vars.state.rules.instantBuild ? 99999 : 1;
            notify("INSTANT BUILD: " + Vars.state.rules.instantBuild);
            return;
        }
        if(cmd === "fillAllItems"){
            fillAllItems();
            notify("CORE FILLED");
            return;
        }
        if(cmd === "clearCoreStorage"){
            clearCoreItems();
            notify("CORE CLEARED");
            return;
        }
        if(cmd === "dumpToGround"){
            clearCoreItems();
            notify("CORE ITEMS PURGED");
            return;
        }
        if(cmd === "lockStorageVals"){
            notify("STORAGE LOCK PLACEHOLDER");
            return;
        }
        if(cmd === "waves:run"){
            forceRules();
            try{ Vars.logic.runWave(); }catch(e){ Vars.state.wavetime = 0; }
            notify("WAVE TRIGGERED");
            return;
        }
        if(cmd === "waves:reset"){
            Vars.state.wave = 1;
            Vars.state.wavetime = Vars.state.rules.waveSpacing;
            notify("WAVE RESET");
            return;
        }
        if(cmd === "waves:index"){
            Vars.state.wave = Math.max(0, payload.wave == null ? 1 : payload.wave);
            notify("WAVE INDEX: " + Vars.state.wave);
            return;
        }
        if(cmd === "waves:auto"){
            forceRules();
            Vars.state.rules.waveTimer = !!payload.value;
            notify("AUTO WAVE: " + Vars.state.rules.waveTimer);
            return;
        }
        if(cmd === "waves:leaderboard"){
            notify("LEADERBOARD NOT AVAILABLE OFFLINE");
            return;
        }
        if(cmd === "world:simSpeed"){
            var mult = payload.speed == null ? 1 : Math.max(1, Math.round(payload.speed));
            applyGameSpeed(mult);
            notify("SIM MULT: x" + mult);
            return;
        }
        if(cmd === "world:timeOfDay"){
            notify("TIME OF DAY: " + payload.value);
            return;
        }
        if(cmd === "world:windStrength"){
            notify("WIND STRENGTH: " + payload.value);
            return;
        }
        if(cmd === "world:fogOfWar"){
            Vars.state.rules.fog = !Vars.state.rules.fog;
            Vars.state.rules.staticFog = Vars.state.rules.fog;
            notify("FOG: " + Vars.state.rules.fog);
            return;
        }
        if(cmd === "world:revealMap"){
            Vars.state.rules.fog = false;
            Vars.state.rules.staticFog = false;
            Vars.state.rules.showSpawns = true;
            notify("MAP REVEALED");
            return;
        }
        if(cmd === "world:freezeWeather"){
            try{ Vars.state.rules.weather.clear(); }catch(e){}
            notify("WEATHER FROZEN");
            return;
        }
        if(cmd === "world:randomizeStorm"){
            try{
                Vars.state.rules.weather.clear();
                Vars.state.rules.weather.add(new Packages.mindustry.type.Weather.WeatherEntry(Weathers.sporestorm, 0.25, 60 * 20, 60 * 120));
            }catch(e){}
            notify("STORM PROFILE UPDATED");
            return;
        }
        if(cmd === "world:liveLink"){
            notify("WORLD LINK OK");
            return;
        }
        if(cmd === "builds:instant"){
            Vars.state.rules.instantBuild = !!payload.value;
            Vars.state.rules.buildSpeedMultiplier = Vars.state.rules.instantBuild ? 99999 : 1;
            notify("BUILD INSTANT: " + Vars.state.rules.instantBuild);
            return;
        }
        if(cmd === "builds:godmode"){
            Vars.state.rules.blockHealthMultiplier = payload.value ? 9999 : 1;
            healAllStructures();
            notify("STRUCTURE GODMODE: " + payload.value);
            return;
        }
        if(cmd === "builds:healAll"){
            healAllStructures();
            notify("STRUCTURES HEALED");
            return;
        }
        if(cmd === "builds:eliminateBases"){
            killBuildings(function(build){ return enemyFilterBuilding(build); });
            notify("ENEMY BASES ELIMINATED");
            return;
        }
        if(cmd === "builds:annihilateSector"){
            killBuildings(function(build){ return enemyFilterBuilding(build); });
            killUnits(function(unit){ return enemyFilterUnit(unit); });
            notify("SECTOR ANNIHILATED");
            return;
        }
        if(cmd === "builds:mapWipe"){
            killBuildings(function(build){
                try{ return !(build.block instanceof CoreBlock) || enemyFilterBuilding(build); }catch(e){ return true; }
            });
            killUnits(function(unit){
                var pu = playerUnit();
                return pu == null || unit != pu;
            });
            notify("MAP WIPED");
            return;
        }
        if(cmd === "units:applyCustomStats"){
            var targetType = payload.unitType;
            if(targetType == null){
                notify("NO UNIT TYPE SELECTED");
                return;
            }
            var newHealth = payload.health == null ? targetType.health : Math.max(1, payload.health);
            var newShield = payload.shield == null ? 0 : Math.max(0, payload.shield);
            var newDamage = payload.damage == null ? null : Math.max(0, payload.damage);
            try{ targetType.health = newHealth; }catch(eHealth){}
            if(newDamage != null){
                try{
                    targetType.weapons.each(cons(function(weapon){
                        try{
                            if(weapon.bullet != null) weapon.bullet.damage = newDamage;
                        }catch(eWD){}
                    }));
                }catch(eWeapons){}
            }
            var team = playerTeam();
            var affected = 0;
            try{
                if(team != null){
                    var data = team.data();
                    if(data != null && data.units != null){
                        var list = data.units;
                        for(var i = 0; i < list.size; i++){
                            try{
                                var unit = list.items[i];
                                if(unit == null || unit.type !== targetType) continue;
                                try{ unit.shield = newShield; }catch(eShield){}
                                affected++;
                            }catch(eInner){}
                        }
                    }
                }
            }catch(eScan){}
            notify("STATS APPLIED: HP " + Math.round(newHealth) + ", SHIELD " + Math.round(newShield) + (newDamage != null ? ", DMG " + Math.round(newDamage) : "") + " (" + affected + " ON MAP)");
            return;
        }
        if(cmd === "player:applyStats"){
            var pu = playerUnit();
            if(pu != null && ui != null && ui.state != null){
                try{ pu.type.health = Math.max(100, ui.state.playerMaxHealth); }catch(e){}
                try{ pu.type.speed = Math.max(0.1, ui.state.playerMoveSpeed); }catch(e2){}
                try{ pu.type.mineSpeed = Math.max(0.1, ui.state.playerMineSpeedMult); }catch(e3){}
                try{ pu.health = pu.type.health; }catch(e4){}
                try{ pu.apply(StatusEffects.overclock, 60 * 20); }catch(e5){}
            }
            notify("PLAYER STATS APPLIED");
            return;
        }
        if(cmd === "player:resetStats"){
            Vars.state.rules.unitHealthMultiplier = 1;
            Vars.state.rules.unitMineSpeedMultiplier = 1;
            capturePlayerDefaults();
            var puReset = playerUnit();
            if(ui != null && ui.state != null && playerDefaults != null){
                ui.state.playerMaxHealth = playerDefaults.health;
                ui.state.playerMoveSpeed = playerDefaults.speed;
                ui.state.playerMineSpeedMult = playerDefaults.mineSpeed > 0 ? playerDefaults.mineSpeed : 1;
                ui.state.playerJumpImpulse = 12.5;
                ui.state.playerRegen = 450;
            }
            if(puReset != null && playerDefaults != null){
                try{ puReset.type.health = playerDefaults.health; }catch(e){}
                try{ puReset.type.speed = playerDefaults.speed; }catch(e2){}
                try{ puReset.type.mineSpeed = playerDefaults.mineSpeed; }catch(e3){}
            }
            notify("PLAYER STATS RESET");
            try{ if(ui != null) ui.rebuild(); }catch(e4){}
            return;
        }
        if(cmd === "player:autoRepair"){
            notify("AUTO REPAIR: " + payload.value);
            return;
        }
        if(cmd.indexOf("player:status:") === 0){
            applyPlayerStatus(cmd);
            notify("STATUS: " + cmd.substring("player:status:".length));
            return;
        }
        if(cmd === "player:healMax"){
            var pu2 = playerUnit();
            if(pu2 != null){
                try{ pu2.health = pu2.maxHealth; }catch(e){}
            }
            notify("PLAYER HEALED");
            return;
        }
        if(cmd === "player:refillAmmo"){
            var pu3 = playerUnit();
            if(pu3 != null){
                try{ pu3.ammo = pu3.type.ammoCapacity; }catch(e){}
            }
            notify("AMMO REFILLED");
            return;
        }
        if(cmd === "player:selfDestruct"){
            var pu4 = playerUnit();
            if(pu4 != null) pu4.kill();
            return;
        }
        if(cmd === "weapon:criticalChance"){
            Vars.state.rules.unitDamageMultiplier = payload.value ? 1.5 : 1;
            notify("CRITICAL CHANCE: " + payload.value);
            return;
        }
        if(cmd === "weapon:instakillLocked"){
            notify("INSTAKILL REQUIRES HIGHER CLEARANCE");
            return;
        }
        if(cmd === "weapon:applyUnits"){
            if(ui != null && ui.state != null){
                ui.state.weaponInstantReload = true;
                Vars.state.rules.unitDamageMultiplier = Math.max(1, ui.state.weaponGlobalDamage);
                applyTeamInstantReload(true);
                captureOriginals();
                for(var wi2 = 0; wi2 < weaponDefaults.length; wi2++){
                    var wd2 = weaponDefaults[wi2];
                    try{
                        if(wd2.weapon.bullet == null) continue;
                        wd2.weapon.inaccuracy = ui.state.weaponSpread;
                        wd2.weapon.bullet.damage = Math.max(wd2.damage, ui.state.weaponBulletDamage);
                        if(ui.state.weaponRange > 0){
                            // реальная дальность = speed * lifetime, поэтому пересчитываем lifetime
                            // под желаемую дальность при текущей скорости пули
                            var wSpeed = wd2.weapon.bullet.speed > 0 ? wd2.weapon.bullet.speed : (wd2.bulletSpeed > 0 ? wd2.bulletSpeed : 1);
                            wd2.weapon.bullet.lifetime = ui.state.weaponRange / wSpeed;
                            wd2.weapon.bullet.range = ui.state.weaponRange; // синхронно для UI/статов
                            if(wd2.weapon.bullet.maxRange > 0) wd2.weapon.bullet.maxRange = ui.state.weaponRange;
                        }
                    }catch(eApplyWeapon){}
                }
            }
            notify("UNIT INSTANT RELOAD ENABLED (OWN TEAM ONLY)");
            return;
        }
        if(cmd === "weapon:resetUnits"){
            applyTeamInstantReload(false);
            Vars.state.rules.unitDamageMultiplier = 1;
            for(var wi3 = 0; wi3 < weaponDefaults.length; wi3++){
                var wd3 = weaponDefaults[wi3];
                try{
                    wd3.weapon.inaccuracy = wd3.inaccuracy;
                    if(wd3.weapon.bullet != null){
                        wd3.weapon.bullet.damage = wd3.damage;
                        wd3.weapon.bullet.range = wd3.bulletRange;
                        wd3.weapon.bullet.maxRange = wd3.bulletMaxRange;
                        wd3.weapon.bullet.lifetime = wd3.bulletLifetime;
                        wd3.weapon.bullet.speed = wd3.bulletSpeed;
                    }
                }catch(eResetWeapon){}
            }
            if(ui != null && ui.state != null){
                ui.state.weaponGlobalDamage = 1.0;
                ui.state.weaponInstantReload = false;
                var su = ui.state.selectedUnit;
                if(su != null && su.weapons != null && su.weapons.size > 0){
                    try{
                        var w = su.weapons.first();
                        ui.state.weaponBulletDamage = w.bullet == null ? 0 : w.bullet.damage;
                        ui.state.weaponSpread = w.inaccuracy;
                        ui.state.weaponRange = (w.bullet != null && w.bullet.speed > 0) ? Math.round(w.bullet.speed * w.bullet.lifetime) : 240;
                    }catch(e0){
                        ui.state.weaponBulletDamage = 45;
                        ui.state.weaponRange = 240;
                        ui.state.weaponSpread = 0.5;
                    }
                }else{
                    ui.state.weaponBulletDamage = 45;
                    ui.state.weaponRange = 240;
                    ui.state.weaponSpread = 0.5;
                }
            }
            notify("UNIT WEAPON PARAMETERS RESET");
            try{ if(ui != null) ui.rebuild(); }catch(e){}
            return;
        }
        if(cmd === "weapon:applyTurrets"){
            if(ui != null && ui.state != null){
                var turretReloadMul = ui.state.turretReloadMult >= 50 ? 0 : (1 / Math.max(0.1, ui.state.turretReloadMult));
                var turretRangeMul = 1 + ui.state.turretRangeBoost / 100;
                var turretSpreadVal = ui.state.turretSpread == null ? 0 : ui.state.turretSpread;
                buffTurrets(turretReloadMul, turretSpreadVal, turretRangeMul);
                Vars.state.rules.blockDamageMultiplier = 1 + ui.state.turretDamageBoost / 100;
            }
            notify("TURRET PARAMETERS APPLIED");
            return;
        }
        if(cmd === "weapon:resetTurrets"){
            resetTurrets();
            Vars.state.rules.blockDamageMultiplier = 1;
            if(ui != null && ui.state != null){
                ui.state.turretReloadMult = 1.0;
                ui.state.turretRangeBoost = 0;
                ui.state.turretDamageBoost = 0;
                ui.state.turretSpread = 0;
            }
            notify("TURRET PARAMETERS RESET");
            try{ if(ui != null) ui.rebuild(); }catch(e){}
            return;
        }
        if(cmd === "radius:toggleTurrets"){
            if(ui != null && ui.state != null){
                ui.state.showTurretRadii = !ui.state.showTurretRadii;
                notify("TURRET RADII: " + (ui.state.showTurretRadii ? "VISIBLE" : "HIDDEN"));
            }
            return;
        }
        if(cmd === "radius:toggleUnits"){
            if(ui != null && ui.state != null){
                ui.state.showUnitRadii = !ui.state.showUnitRadii;
                notify("UNIT RADII: " + (ui.state.showUnitRadii ? "VISIBLE" : "HIDDEN"));
            }
            return;
        }
        if(cmd === "mining:buildBoost"){
            Vars.state.rules.buildSpeedMultiplier = payload.value ? 2 : 1;
            notify("BUILD BOOST: " + payload.value);
            return;
        }
        if(cmd === "mining:efficiency"){
            Vars.state.rules.unitMineSpeedMultiplier = payload.value ? 2 : 1;
            notify("EFFICIENCY BOOST: " + payload.value);
            return;
        }
        if(cmd === "mining:setSpeed"){
            var speedVal = payload.value == null ? 1 : payload.value;
            try{ Vars.state.rules.unitMineSpeedMultiplier = Math.max(0.1, speedVal); }catch(eSpeed){}
            return;
        }