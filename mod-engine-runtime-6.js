function injectItem(payload){
        if(payload == null || payload.item == null) return;
        addItemToCore(payload.item, payload.amount == null ? 1 : payload.amount);
        notify("ITEM INJECTED");
    }

    function spawnUnit(payload){
        if(payload == null || payload.unit == null) return;
        var px = 0;
        var py = 0;
        var amount = payload.amount == null ? 1 : Math.max(1, payload.amount);
        var team = payload.enemy ? enemyTeam() : playerTeam();
        try{ px = Vars.player.x; py = Vars.player.y; }catch(e){}
        try{
            for(var i = 0; i < amount; i++){
                var ox = (i % 5) * 12;
                var oy = Math.floor(i / 5) * 12;
                payload.unit.spawn(team, px + ox, py + oy);
            }
            notify("UNIT SPAWNED: " + payload.unit.localizedName + " x" + amount);
        }catch(e2){
            Log.err("Unit spawn failed", e2);
            notify("UNIT SPAWN FAILED");
        }
    }

    function unitAction(payload){
        if(payload == null) return;
        var action = payload.action == null ? "" : String(payload.action);
        var unit = payload.unit;
        var type = payload.unitType;

        if(action === "select"){
            return;
        }
        if(action === "teleport"){
            var pu = playerUnit();
            if(unit != null && pu != null){
                try{
                    unit.set(pu.x, pu.y);
                    try{ unit.vel.setZero(); }catch(e2){}
                    notify("UNIT TELEPORTED");
                }catch(e){}
            }
            try{ if(ui != null) ui.rebuild(); }catch(e3){}
            return;
        }
        if(action === "clone"){
            if(unit != null){
                try{
                    unit.type.spawn(teamOf(unit), unit.x + 12, unit.y + 12);
                    notify("UNIT CLONED");
                }catch(e){}
            }else if(type != null){
                spawnUnit({unit: type});
            }
            try{ if(ui != null) ui.rebuild(); }catch(e4){}
            return;
        }
        if(action === "destruct"){
            try{ if(unit != null) unit.kill(); }catch(e){}
            try{ if(ui != null && ui.state != null) ui.state.selectedWorldUnit = null; }catch(e2){}
            try{ if(ui != null) ui.rebuild(); }catch(e3){}
            return;
        }
        if(action === "team"){
            try{
                if(unit != null){
                    var current = teamOf(unit);
                    var next = current == playerTeam() ? enemyTeam() : playerTeam();
                    setUnitTeam(unit, next);
                }
                notify("UNIT TEAM CHANGED");
            }catch(e){}
            try{ if(ui != null) ui.rebuild(); }catch(e2){}
            return;
        }

        var groupUnits = payload.units;
        if(action === "groupTeleport" && groupUnits != null){
            var pu2 = playerUnit();
            var count = 0;
            if(pu2 != null){
                for(var gi = 0; gi < groupUnits.length; gi++){
                    try{
                        var gu = groupUnits[gi];
                        if(gu == null || gu.dead) continue;
                        gu.set(pu2.x + (gi % 10) * 8, pu2.y + Math.floor(gi / 10) * 8);
                        try{ gu.vel.setZero(); }catch(eV){}
                        count++;
                    }catch(eG){}
                }
            }
            notify(count + " UNITS TELEPORTED");
            try{ if(ui != null) ui.rebuild(); }catch(eR){}
            return;
        }
        if(action === "groupClone" && groupUnits != null){
            var count2 = 0;
            for(var gi2 = 0; gi2 < groupUnits.length; gi2++){
                try{
                    var gu2 = groupUnits[gi2];
                    if(gu2 == null || gu2.dead) continue;
                    gu2.type.spawn(teamOf(gu2), gu2.x + 12, gu2.y + 12);
                    count2++;
                }catch(eG2){}
            }
            notify(count2 + " UNITS CLONED");
            try{ if(ui != null) ui.rebuild(); }catch(eR2){}
            return;
        }
        if(action === "groupTeam" && groupUnits != null){
            var count3 = 0;
            for(var gi3 = 0; gi3 < groupUnits.length; gi3++){
                try{
                    var gu3 = groupUnits[gi3];
                    if(gu3 == null || gu3.dead) continue;
                    var cur3 = teamOf(gu3);
                    var next3 = cur3 == playerTeam() ? enemyTeam() : playerTeam();
                    setUnitTeam(gu3, next3);
                    count3++;
                }catch(eG3){}
            }
            notify(count3 + " UNITS TEAM CHANGED");
            try{ if(ui != null) ui.rebuild(); }catch(eR3){}
            return;
        }
        if(action === "groupDestruct" && groupUnits != null){
            var count4 = 0;
            for(var gi4 = 0; gi4 < groupUnits.length; gi4++){
                try{
                    var gu4 = groupUnits[gi4];
                    if(gu4 == null || gu4.dead) continue;
                    gu4.kill();
                    count4++;
                }catch(eG4){}
            }
            notify(count4 + " UNITS DESTROYED");
            try{ if(ui != null && ui.state != null) ui.state.selectedWorldUnit = null; }catch(eS4){}
            try{ if(ui != null) ui.rebuild(); }catch(eR4){}
            return;
        }
    }

    function bindHandlers(modUi){
        ui = modUi;
        modUi.configure({
            handlers: {
                initialize: function(){
                    forceRules();
                    Vars.state.rules.infiniteResources = true;
                    notify("MOD ENGINE INITIALIZED");
                },
                openDocs: function(){
                    try{ Vars.ui.showInfoText("Mod Engine", "Mindustry V8 runtime controls are active."); }catch(e){ notify("DOCS UNAVAILABLE"); }
                },
                support: function(){
                    notify("SUPPORT CHANNEL NOT CONFIGURED");
                },
                language: function(payload){
                    try{ Vars.ui.language.show(); }catch(e){ notify("LANGUAGE UI UNAVAILABLE"); }
                },
                nav: function(payload){
                    Log.info("Mod Engine tab opened: @", payload.tab);
                },
                injectItem: injectItem,
                spawnUnit: spawnUnit,
                command: callCommand,
                unitAction: unitAction
            }
        });
    }

    function drawRadiusCircle(x, y, radius, color, alpha){
        Draw.color(color, alpha == null ? 0.35 : alpha);
        Lines.stroke(2);
        Lines.circle(x, y, radius);
        Draw.reset();
    }

    function drawTurretRadii(){
        var team = playerTeam();
        try{
            Groups.build.each(cons(function(build){
                try{
                    if(build.block == null || !(build.block instanceof Turret)) return;
                    var buildTeam = null;
                    try{ buildTeam = build.team(); }catch(eT){ buildTeam = build.team; }
                    if(team != null && buildTeam != null && buildTeam != team) return;
                    var color = buildTeam != null ? buildTeam.color : Color.white;
                    drawRadiusCircle(build.x, build.y, build.block.range, color, 0.4);
                }catch(eInner){}
            }));
        }catch(e){}
    }

    function drawUnitRadii(){
        var team = playerTeam();
        if(team == null) return;
        try{
            var data = team.data();
            if(data == null || data.units == null) return;
            var list = data.units;
            for(var i = 0; i < list.size; i++){
                try{
                    var unit = list.items[i];
                    if(unit == null || unit.type == null) continue;
                    var weaponRange = 0;
                    try{
                        if(unit.type.weapons != null && unit.type.weapons.size > 0){
                            var weapon = unit.type.weapons.first();
                            if(weapon != null && weapon.bullet != null && weapon.bullet.speed > 0 && weapon.bullet.lifetime > 0){
                                weaponRange = weapon.bullet.speed * weapon.bullet.lifetime;
                            }
                        }
                    }catch(eW){}
                    if(weaponRange > 0){
                        drawRadiusCircle(unit.x, unit.y, weaponRange, theme.gold, 0.3);
                    }
                    if(unit.type.mineTier >= 0 && unit.type.mineSpeed > 0){
                        var mineRange = 0;
                        try{ mineRange = unit.type.mineRange; }catch(eM){}
                        if(mineRange > 0){
                            drawRadiusCircle(unit.x, unit.y, mineRange, theme.cyan, 0.3);
                        }
                    }
                }catch(eInner){}
            }
        }catch(e){}
    }

    function installLifecycle(modUi){
        ui = modUi;
        var miningTimer = 0;

        Events.on(ClientLoadEvent, cons(function(){
            captureOriginals();
            applyGameSpeed(1);
            Core.app.post(run(function(){
                ensureHudButton();
                try{ UserWorkbench.load(); }catch(e){}
            }));
        }));

        Events.on(WorldLoadEvent, cons(function(){
            applyGameSpeed(1);
            playerDefaults = null;
            Core.app.post(run(function(){
                ensureHudButton();
                capturePlayerDefaults();
            }));
        }));

        Events.run(Trigger.draw, run(function(){
            if(ui == null || ui.state == null) return;
            if(!inGame()) return;
            try{
                if(ui.state.showTurretRadii) drawTurretRadii();
            }catch(eT){}
            try{
                if(ui.state.showUnitRadii) drawUnitRadii();
            }catch(eU){}
        }));

        Events.run(Trigger.update, run(function(){
            if(ui == null) return;
            if(!inGame()) return;
            try{
                if(playerDefaults == null) capturePlayerDefaults();
            }catch(eCap){}
            try{
                if(hudRoot == null || !hudRoot.hasParent()) ensureHudButton();
            }catch(e){}

            if(ui.state != null && ui.state.playerAutoRepair){
                try{
                    var pu = playerUnit();
                    if(pu != null && pu.health < pu.maxHealth){
                        pu.heal(Math.max(1, ui.state.playerRegen / 60));
                    }
                }catch(e2){}
            }

            if(ui.state != null && ui.state.buildGodmode){
                try{ healAllStructures(); }catch(e3){}
            }

            try{
                var fleetTeamRefresh = playerTeam();
                for(var refreshTypeKey in fleetAssignments){
                    var refreshList = fleetAssignments[refreshTypeKey];
                    if(!Array.isArray(refreshList)) refreshList = refreshList ? [refreshList] : [];
                    if(refreshList.length === 0) continue;
                    eachFleetUnit(refreshTypeKey, fleetTeamRefresh, function(fu){
                        if(!unitHasMineCommand(fu)){
                            for(var ri = 0; ri < refreshList.length; ri++){
                                var refreshItem = null;
                                try{ refreshItem = Vars.content.item(refreshList[ri]); }catch(eFI){}
                                if(refreshItem != null) toggleUnitMineItem(fu, refreshItem, true);
                            }
                        }
                    });
                }
                if(ui.state != null && ui.state.miningProtocolActive){
                    var pu2 = playerUnit();
                    if(pu2 != null){
                        if(unitCargoFull(pu2)){
                            deliverCargoToCorePlayerSafe(pu2);
                        }
                    }
                }
                if(ui.state != null && ui.state.weaponInstantReload){
                    applyTeamInstantReload(true);
                }
            }catch(eRefresh){}

            miningTimer++;
            if(ui.state != null && miningTimer >= 60){
                miningTimer = 0;
                try{
                    if(ui.state.miningProtocolActive){
                        var mineUnit = playerUnit();
                        if(mineUnit == null || mineUnit.dead){
                            ui.state.miningProtocolActive = false;
                        }else{
                            var hasTarget = unitMineTile(mineUnit) != null;
                            var stillMining = false;
                            try{ stillMining = mineUnit.mining(); }catch(eMin){ stillMining = hasTarget; }
                            if(!hasTarget && !stillMining){
                                var watchItem = null;
                                try{ watchItem = Vars.content.item(ui.state.selectedMiningTarget); }catch(e5){}
                                if(watchItem != null){
                                    commandUnitMine(mineUnit, watchItem, true);
                                }
                            }
                        }
                    }
                }catch(e7){}
            }
        }));
    }

    return {
        bindHandlers: bindHandlers,
        installLifecycle: installLifecycle,
        ensureHudButton: ensureHudButton
    };
})();

module.exports = ModEngineRuntime;
})();