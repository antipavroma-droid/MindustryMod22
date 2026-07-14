(function(){
var Core = Packages.arc.Core;
var Color = Packages.arc.graphics.Color;
var Draw = Packages.arc.graphics.g2d.Draw;
var Fill = Packages.arc.graphics.g2d.Fill;
var Lines = Packages.arc.graphics.g2d.Lines;
var Log = Packages.arc.util.Log;
var Time = Packages.arc.util.Time;

var BaseDrawable = Packages.arc.scene.style.BaseDrawable;
var Table = Packages.arc.scene.ui.layout.Table;
var TextButton = Packages.arc.scene.ui.TextButton;
var Touchable = Packages.arc.scene.event.Touchable;

var Vars = Packages.mindustry.Vars;
var Styles = Packages.mindustry.ui.Styles;
var Fonts = Packages.mindustry.ui.Fonts;
var Icon = Packages.mindustry.gen.Icon;
var Groups = Packages.mindustry.gen.Groups;
var Team = Packages.mindustry.game.Team;
var StatusEffects = Packages.mindustry.content.StatusEffects;
var Weathers = Packages.mindustry.content.Weathers;
var Turret = Packages.mindustry.world.blocks.defense.turrets.Turret;
var CoreBlock = Packages.mindustry.world.blocks.storage.CoreBlock;
var LogicAI = Packages.mindustry.ai.types.LogicAI;
var CommandAI = Packages.mindustry.ai.types.CommandAI;
var UnitCommand = Packages.mindustry.ai.UnitCommand;
var Vec2 = Packages.arc.math.geom.Vec2;
var Call = Packages.mindustry.gen.Call;

var Trigger = Packages.mindustry.game.EventType.Trigger;
var ClientLoadEvent = Packages.mindustry.game.EventType.ClientLoadEvent;
var WorldLoadEvent = Packages.mindustry.game.EventType.WorldLoadEvent;

var UserWorkbench = require("user-workbench");

function scriptsApi(){
    try{ return Vars.mods == null ? null : Vars.mods.getScripts(); }catch(e){ return null; }
}

    function enemyTeam(){
    try{
        if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.waveTeam != null) return Vars.state.rules.waveTeam;
    }catch(e){}
    try{ return Packages.mindustry.game.Team.crux; }catch(e2){ return Team.crux; }
}

function playerCore(){
    try{ return Vars.player == null ? null : Vars.player.closestCore(); }catch(e){ return null; }
}

function findOreTile(unit, item){
    if(unit == null || item == null) return null;
    try{
        if(Vars.indexer != null) return Vars.indexer.findClosestOre(unit.x, unit.y, item);
    }catch(e){}
    return null;
}

function ensureCommandController(unit){
    if(unit == null) return null;
    var ai = null;
    try{
        var current = unit.controller();
        if(current instanceof CommandAI){
            ai = current;
        }
    }catch(eGet){}
    if(ai == null){
        try{
            ai = new CommandAI();
            unit.controller(ai);
        }catch(eSet){
            return null;
        }
    }
    return ai;
}

function callCommandMethod(ai, unit, cmd){
    try{
        // Как в UnitType.create(): command.command = defaultCommand — прямое присваивание полю,
        // а не вызов метода. Это обходит конфликт поле/метод в Rhino полностью.
        if(unit.type == null || unit.type.commands == null || !unit.type.commands.contains(cmd)){
            return false;
        }
        ai.command = cmd;
        // Повторяем побочные эффекты метода CommandAI.command(), которые мы теряем,
        // не вызывая сам метод:
        unit.mineTile = null;
        try{ unit.clearBuilding(); }catch(eCb){}
        return true;
    }catch(e){
        Log.info("MOD_ENGINE_MINE_DEBUG: direct command assignment threw @", e);
        return false;
    }
}
function getItemStance(item){
    try{
        return Packages.mindustry.ai.ItemUnitStance.getByItem(item);
    }catch(e){
        return null;
    }
}

function unitHasMineCommand(unit){
    try{
        var curAi = unit.controller();
        return curAi instanceof CommandAI && curAi.command === UnitCommand.mineCommand;
    }catch(e){
        return false;
    }
}

// Включает/выключает конкретную руду в списке добычи юнита, НЕ сбрасывая уже
// идущий майнинг других выбранных руд (в отличие от setUnitMineTile, который
// заменяет цель целиком). Это и есть логика "несколько руд одновременно".
function toggleUnitMineItem(unit, item, enabled){
    if(unit == null || item == null) return false;

    var ai = ensureCommandController(unit);
    if(ai == null) return false;

    try{
        if(unit.type == null || unit.type.commands == null || !unit.type.commands.contains(UnitCommand.mineCommand)){
            return false;
        }
    }catch(eSupport){
        return false;
    }

    // Команду mineCommand выставляем только если она ещё не установлена —
    // иначе callCommandMethod() каждый раз обнуляет unit.mineTile и прерывает
    // уже идущий сбор других руд.
    if(!unitHasMineCommand(unit)){
        try{ callCommandMethod(ai, unit, UnitCommand.mineCommand); }catch(eCmd){ return false; }
    }

    var stance = getItemStance(item);
    if(stance == null) return false;

    try{
        if(enabled){
            ai.setStance(stance);
        }else{
            try{ ai.disableStance(stance); }catch(eDis){
                // fallback на случай другого имени метода в этой версии API
                try{ ai["disableStance"](stance); }catch(eDis2){}
            }
        }
    }catch(eStance){
        return false;
    }

    if(enabled){
        // fallback: если юнит ничем сейчас не занят, сразу подсказываем ближайшую руду,
        // чтобы не ждать следующего внутреннего тика MinerAI
        try{
            if(unitMineTile(unit) == null){
                var oreTile = findOreTile(unit, item);
                if(oreTile != null) unit.mineTile = oreTile;
            }
        }catch(eOre){}
    }

    return true;
}

function toggleFleetMiningItem(unitTypeName, item, enabled, team){
    var affected = 0;
    eachFleetUnit(unitTypeName, team, function(unit){
        if(toggleUnitMineItem(unit, item, enabled)) affected++;
    });
    return affected;
}

function setUnitMineTile(unit, item, preserveController){
    if(unit == null) return false;
    if(preserveController){
        // player-driven unit: PlayerController already handles native mine-and-return behavior,
        // just set the field directly and never touch the controller.
        try{
            if(item != null){
                var tile = findOreTile(unit, item);
                if(tile == null) return false;
                var canMineHere = true;
                try{ canMineHere = unit.canMine(); }catch(eCan){}
                if(!canMineHere) return false;
                unit.mineTile = tile;
                return true;
            }else{
                unit.mineTile = null;
                return true;
            }
        }catch(e){
            return false;
        }
    }

    var ai = ensureCommandController(unit);
    if(ai == null) return false;

    if(item == null){
        try{ callCommandMethod(ai, unit, UnitCommand.moveCommand); }catch(eClearCmd){}
        try{ unit.mineTile = null; }catch(eClearTile){}
        return true;
    }

    try{
        var canMineHere = true;
        try{ canMineHere = unit.canMine(item); }catch(eCan){ try{ canMineHere = unit.canMine(); }catch(eCan2){} }
        if(!canMineHere) return false;
    }catch(eValid){}

    try{
        if(unit.type == null || unit.type.commands == null || !unit.type.commands.contains(UnitCommand.mineCommand)){
            Log.info("MOD_ENGINE_MINE_DEBUG: unit @ type @ does NOT support mineCommand", unit.id, unit.type == null ? "null" : unit.type.name);
            return false;
        }
    }catch(eSupport){
        Log.info("MOD_ENGINE_MINE_DEBUG: commands check threw @", eSupport);
    }

    try{
        var commandOk = callCommandMethod(ai, unit, UnitCommand.mineCommand);
        Log.info("MOD_ENGINE_MINE_DEBUG: direct command assign ok=@, ai.command == @", commandOk, ai.command);

        var stance = getItemStance(item);
        Log.info("MOD_ENGINE_MINE_DEBUG: stance for item @ = @", item.name, stance);
        if(stance != null){
            ai.setStance(stance);
            Log.info("MOD_ENGINE_MINE_DEBUG: hasStance after set = @", ai.hasStance(stance));
        }

        // Fallback: явно ищем ближайшую руду и ставим mineTile напрямую,
        // на случай если внутренний MinerAI-делегат не начинает поиск сразу же в этот тик.
        try{
            var oreTile = findOreTile(unit, item);
            Log.info("MOD_ENGINE_MINE_DEBUG: findOreTile result = @", oreTile);
            if(oreTile != null){
                unit.mineTile = oreTile;
            }
        }catch(eOre){
            Log.info("MOD_ENGINE_MINE_DEBUG: findOreTile threw @", eOre);
        }

        return true;
    }catch(eCmd){
        Log.info("MOD_ENGINE_MINE_DEBUG: command/stance threw @", eCmd);
        return false;
    }
}

function unitMineTile(unit){
    if(unit == null) return null;
    try{ return unit.mineTile; }catch(e){
        try{ return unit.mineTile(); }catch(e2){ return null; }
    }
}

function clearUnitMining(unit, preserveController){
    setUnitMineTile(unit, null, preserveController);
}

function commandUnitMine(unit, item, preserveController){
    if(unit == null) return false;
    if(item == null){
        clearUnitMining(unit, preserveController);
        return false;
    }
    return setUnitMineTile(unit, item, preserveController);
}

function unitCargoFull(unit){
    try{
        if(unit.stack == null || unit.type == null) return false;
        return unit.stack.amount >= unit.type.itemCapacity;
    }catch(e){
        return false;
    }
}

function unitCargoEmpty(unit){
    try{
        return !unit.hasItem();
    }catch(eHas){
        try{
            return unit.stack == null || unit.stack.amount <= 0;
        }catch(e){
            return true;
        }
    }
}

function closestCoreForUnit(unit){
    try{
        var team = null;
        try{ team = unit.team(); }catch(eT){ team = unit.team; }
        if(team == null) return null;
        return team.core();
    }catch(e){
        return null;
    }
}

function deliverCargoToCorePlayerSafe(unit){
    if(unit == null) return false;
    if(unitCargoEmpty(unit)) return false;
    var core = closestCoreForUnit(unit);
    if(core == null) return false;

    var range = 5.625 * 8;
    try{ range = 5.625 * 8 + (core.block != null ? core.block.size * 8 / 2 : 0); }catch(eRange){}

    var within = false;
    try{ within = unit.within(core, range); }catch(eWithin){
        try{
            var dx = unit.x - core.x, dy = unit.y - core.y;
            within = (dx * dx + dy * dy) <= range * range;
        }catch(eWithin2){}
    }
    if(!within) return false;

    try{
        var item = unit.stack.item;
        var amount = unit.stack.amount;
        var accepted = amount;
        try{
            var unitTeamRef = null;
            try{ unitTeamRef = unit.team(); }catch(eUT){ unitTeamRef = unit.team; }
            accepted = Math.min(amount, core.acceptStack(item, amount, unitTeamRef));
        }catch(eAccept){}
        if(accepted > 0){
            Call.transferItemTo(unit, item, accepted, unit.x, unit.y, core);
        }
    }catch(eTransfer){}
    return true;
}

function canUnitMine(unit){
    try{
        return unit.type != null && unit.type.mineTier >= 0 && unit.type.mineSpeed > 0;
    }catch(e){
        return false;
    }
}

function eachFleetUnit(unitTypeName, team, fn){
    if(unitTypeName == null || team == null) return;
    try{
        var data = team.data();
        if(data == null || data.units == null) return;
        var list = data.units;
        for(var i = 0; i < list.size; i++){
            try{
                var unit = list.items[i];
                if(unit == null || unit.type == null) continue;
                if(String(unit.type.name) !== String(unitTypeName)) continue;
                if(!canUnitMine(unit)) continue;
                fn(unit);
            }catch(eInner){}
        }
    }catch(e){}
}

function assignFleetMining(unitTypeName, item, team){
    var assigned = 0;
    eachFleetUnit(unitTypeName, team, function(unit){
        if(commandUnitMine(unit, item)) assigned++;
    });
    return assigned;
}

function clearFleetMining(unitTypeName, team){
    eachFleetUnit(unitTypeName, team, function(unit){
        clearUnitMining(unit);
    });
}

function countFleetUnits(unitTypeName, team){
    var total = 0;
    eachFleetUnit(unitTypeName, team, function(unit){ total++; });
    return total;
}

function countFleetActive(unitTypeName, team){
    var total = 0;
    eachFleetUnit(unitTypeName, team, function(unit){
        var active = false;
        try{ active = unit.mining(); }catch(e){ try{ active = unitMineTile(unit) != null; }catch(e2){} }
        if(active) total++;
    });
    return total;
}

var ModEngineRuntime = (function(){
    var timeSpeed = 1;

    function applyGameSpeed(mult){
        timeSpeed = Math.max(1, mult == null ? 1 : mult);
        try{
            Time.setDeltaProvider(new JavaAdapter(Packages.arc.func.Floatp, {
                get: function(){
                    return Math.min(Core.graphics.getDeltaTime() * 60 * timeSpeed, 60 * timeSpeed);
                }
            }));
        }catch(e){
            Log.err("Failed to apply game speed", e);
        }
    }

    var ui = null;
    var hudRoot = null;
    var hudButton = null;
    var originalsCaptured = false;
    var turretDefaults = [];
    var weaponDefaults = [];
    var playerDefaults = null;
    var fleetAssignments = {};

    var theme = {
        panel: Color.valueOf("121922"),
        panel2: Color.valueOf("171e28"),
        panel3: Color.valueOf("202833"),
        line: Color.valueOf("2c3542"),
        gold: Color.valueOf("ffd28a"),
        goldDark: Color.valueOf("4a3924"),
        cyan: Color.valueOf("10e5e5"),
        cyanDark: Color.valueOf("06383d"),
        text: Color.valueOf("d8dde7"),
        muted: Color.valueOf("a99f91"),
        red: Color.valueOf("ffb3ae"),
        redDark: Color.valueOf("401019"),
        green: Color.valueOf("31d17a"),
        black: Color.valueOf("05090f")
    };

    function inGame(){
        try{
            return Vars.state != null && Vars.state.isGame();
        }catch(e){
            try{
                return Vars.state != null && !Vars.state.isMenu();
            }catch(e2){
                return false;
            }
        }
    }

    function player(){
        try{ return Vars.player; }catch(e){ return null; }
    }

    function playerUnit(){
        try{
            return Vars.player == null ? null : Vars.player.unit();
        }catch(e){
            return null;
        }
    }

    function playerTeam(){
        try{
            return Vars.player == null ? Team.sharded : Vars.player.team();
        }catch(e){
            return Team.sharded;
        }
    }

    function notify(text){
        try{
            Vars.ui.showInfoToast(String(text), 3);
        }catch(e){
            Log.info(String(text));
        }
    }

    function appendConsole(line){
        if(ui == null || ui.state == null) return;
        if(ui.state.consoleLines == null) ui.state.consoleLines = [];
        ui.state.consoleLines.push(String(line));
        if(ui.state.consoleLines.length > 80){
            ui.state.consoleLines.shift();
        }
        try{
            if(ui.state.tab === "console") ui.rebuild();
        }catch(e){}
    }

    function makeDrawable(fill, stroke, accent){
        var background = fill;
        var border = stroke;
        var accentColor = accent;
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                Draw.color(background);
                Fill.rect(x + width / 2, y + height / 2, width, height);
                Draw.color(border);
                Lines.stroke(1);
                Lines.rect(x + 0.5, y + 0.5, width - 1, height - 1);
                if(accentColor != null){
                    Draw.color(accentColor);
                    Fill.rect(x + width / 2, y + height - 1.5, width, 3);
                }
                Draw.reset();
            }
        });
    }

    function hudButtonStyle(){
        var style = new TextButton.TextButtonStyle(Styles.defaultt);
        style.up = makeDrawable(theme.panel2, theme.goldDark, theme.gold);
        style.over = makeDrawable(theme.panel3, theme.goldDark, theme.gold);
        style.down = makeDrawable(theme.black, theme.cyanDark, theme.cyan);
        style.checked = style.down;
        style.font = Fonts.def;
        style.fontColor = theme.text;
        style.overFontColor = theme.gold;
        style.downFontColor = theme.cyan;
        style.checkedFontColor = theme.cyan;
        return style;
    }

    function ensureHudButton(){
        if(ui == null) return;
        if(Vars.ui == null || Vars.ui.hudGroup == null) return;
        if(hudRoot != null){
            try{
                if(hudRoot.hasParent()) return;
            }catch(e){}
        }

        hudRoot = new Table();
        hudRoot.setFillParent(true);
        hudRoot.top().left();
        hudRoot.touchable = Touchable.childrenOnly;

        var holder = new Table();
        holder.left().top();
        holder.marginTop(Core.graphics.getWidth() < 1400 ? 108 : 116);
        holder.marginLeft(10);

        hudButton = new TextButton("MOD ENGINE", hudButtonStyle());
        hudButton.clicked(run(function(){
            try{
                if(ui != null) ui.show();
            }catch(e){
                Log.err("Failed to open Mod Engine UI", e);
            }
        }));

        holder.add(hudButton).height(48).minWidth(170);
        hudRoot.add(holder).left().top();

        hudRoot.update(run(function(){
            try{
                var show = inGame();
                hudRoot.visible = show;
                if(show){
                    holder.marginTop(Core.graphics.getWidth() < 1400 ? 108 : 116);
                    hudRoot.toFront();
                }
            }catch(e){}
        }));

        Vars.ui.hudGroup.addChild(hudRoot);
    }

    function eachCore(team, fn){
        if(team == null || fn == null) return;
        try{
            team.cores().each(cons(function(core){
                fn(core);
            }));
        }catch(e){}
    }

    function firstPlayerCore(){
        var team = playerTeam();
        if(team == null) return null;
        try{
            var cores = team.cores();
            return (cores != null && cores.size > 0) ? cores.first() : null;
        }catch(e){
            return null;
        }
    }

    function addItemToCore(item, amount){
        if(item == null || amount == null) return;
        var core = firstPlayerCore();
        if(core == null) return;
        try{ core.items.add(item, amount); }catch(e){}
    }

    function clearCoreItems(){
        var core = firstPlayerCore();
        if(core == null) return;
        try{
            Vars.content.items().each(cons(function(item){
                try{ core.items.remove(item, core.items.get(item)); }catch(eItem){}
            }));
        }catch(e){}
    }

    function fillAllItems(){
        var core = firstPlayerCore();
        if(core == null) return;
        try{
            Vars.content.items().each(cons(function(item){
                try{
                    var current = core.items.get(item);
                    var maxAccepted = core.getMaximumAccepted(item);
                    core.items.set(item, current + Math.max(0, maxAccepted));
                }catch(eItem){}
            }));
        }catch(e){}
    }

    function capturePlayerDefaults(){
        if(playerDefaults != null) return;
        var pu = playerUnit();
        if(pu == null || pu.type == null) return;
        playerDefaults = {
            health: pu.type.health,
            speed: pu.type.speed,
            mineSpeed: pu.type.mineSpeed
        };
    }

    function forEachTurret(fn){
        try{
            Vars.content.blocks().each(function(b){
                try{
                    if(b instanceof Turret) fn(b);
                }catch(e){}
            });
        }catch(e){}
    }

    function captureOriginals(){
        if(originalsCaptured) return;
        originalsCaptured = true;
        capturePlayerDefaults();

        try{
            Vars.content.blocks().each(cons(function(block){
                if(block instanceof Turret){
                    var ammoDefaults = [];
                    try{
                        if(block.ammoTypes == null){
                            if(block.name === "duo"){
                                Log.info("MOD_ENGINE_TURRET_DEBUG: duo.ammoTypes is NULL");
                            }
                        }else{
                            var keyCount = 0;
                            block.ammoTypes.each(function(item, bt){
                                keyCount++;
                                if(bt == null) return;
                                ammoDefaults.push({
                                    bullet: bt,
                                    range: bt.range,
                                    maxRange: bt.maxRange,
                                    lifetime: bt.lifetime,
                                    speed: bt.speed
                                });
                            });
                            if(block.name === "duo"){
                                Log.info("MOD_ENGINE_TURRET_DEBUG: duo.ammoTypes not null, keyCount=@, ammoDefaults.length=@", keyCount, ammoDefaults.length);
                            }
                        }
                    }catch(eAmmo){
                        Log.info("MOD_ENGINE_TURRET_DEBUG: ammo capture for block=@ threw @", block.name, eAmmo);
                    }
                    var weaponAmmoDefaults = [];
                    try{
                        if(block.weapons != null){
                            for(var wi = 0; wi < block.weapons.size; wi++){
                                var w = block.weapons.get(wi);
                                var wbt = w.bullet;
                                if(wbt == null) continue;
                                weaponAmmoDefaults.push({
                                    bullet: wbt,
                                    range: wbt.range,
                                    maxRange: wbt.maxRange,
                                    lifetime: wbt.lifetime,
                                    speed: wbt.speed
                                });
                            }
                        }
                    }catch(eWAmmo){
                        Log.info("MOD_ENGINE_TURRET_DEBUG: weapon-ammo capture for block=@ threw @", block.name, eWAmmo);
                    }
                    turretDefaults.push({
                        block: block,
                        reload: block.reload,
                        inaccuracy: block.inaccuracy,
                        range: block.range,
                        ammoDefaults: ammoDefaults,
                        weaponAmmoDefaults: weaponAmmoDefaults
                    });
                }
            }));
        }catch(e){
            Log.err("Failed to capture turret defaults", e);
        }

        try{
            Vars.content.units().each(cons(function(type){
                var index = 0;
                type.weapons.each(cons(function(weapon){
                    weaponDefaults.push({
                        weapon: weapon,
                        key: String(type.name) + ":" + index,
                        reload: weapon.reload,
                        inaccuracy: weapon.inaccuracy,
                        damage: weapon.bullet == null ? 0 : weapon.bullet.damage,
                        speed: weapon.bullet == null ? 0 : weapon.bullet.speed,
                        lifetime: weapon.bullet == null ? 0 : weapon.bullet.lifetime,
                        bulletRange: weapon.bullet == null ? 0 : weapon.bullet.range,
                        bulletMaxRange: weapon.bullet == null ? 0 : weapon.bullet.maxRange,
                        bulletLifetime: weapon.bullet == null ? 0 : weapon.bullet.lifetime,
                        bulletSpeed: weapon.bullet == null ? 0 : weapon.bullet.speed
                    });
                    index++;
                }));
            }));
        }catch(e2){
            Log.err("Failed to capture weapon defaults", e2);
        }
    }

    function resetTurrets(){
        for(var i = 0; i < turretDefaults.length; i++){
            var d = turretDefaults[i];
            try{
                d.block.reload = d.reload;
                d.block.inaccuracy = d.inaccuracy;
                d.block.range = d.range;
                for(var a = 0; a < d.ammoDefaults.length; a++){
                    var ad = d.ammoDefaults[a];
                    try{
                        ad.bullet.range = ad.range;
                        ad.bullet.maxRange = ad.maxRange;
                        ad.bullet.lifetime = ad.lifetime;
                        ad.bullet.speed = ad.speed;
                    }catch(eA){}
                }
                if(d.weaponAmmoDefaults != null){
                    for(var wa = 0; wa < d.weaponAmmoDefaults.length; wa++){
                        var wad = d.weaponAmmoDefaults[wa];
                        try{
                            wad.bullet.range = wad.range;
                            wad.bullet.maxRange = wad.maxRange;
                            wad.bullet.lifetime = wad.lifetime;
                            wad.bullet.speed = wad.speed;
                        }catch(eWA){}
                    }
                }
            }catch(e){}
        }
    }

    function buffTurrets(reloadMul, inaccuracy, rangeMul){
        captureOriginals();
        Log.info("MOD_ENGINE_TURRET_DEBUG: buffTurrets called, rangeMul=@ turretDefaults.length=@", rangeMul, turretDefaults.length);
        var loggedOnce = false;
        for(var i = 0; i < turretDefaults.length; i++){
            var d = turretDefaults[i];
            try{
                d.block.reload = Math.max(0, d.reload * reloadMul);
                d.block.inaccuracy = inaccuracy;
                var targetRange = d.range * rangeMul;
                d.block.range = targetRange;
                for(var a = 0; a < d.ammoDefaults.length; a++){
                    var ad = d.ammoDefaults[a];
                    try{
                        var beforeLifetime = ad.bullet.lifetime;
                        // Формула из проверенного рабочего кода: lifetime = targetRange / speed,
                        // maxRange = targetRange безусловно (не только когда maxRange > 0 изначально)
                        if(ad.bullet.speed > 0) ad.bullet.lifetime = targetRange / ad.bullet.speed;
                        ad.bullet.maxRange = targetRange;
                        if(!loggedOnce){
                            loggedOnce = true;
                            Log.info("MOD_ENGINE_TURRET_DEBUG: block=@ ammo lifetime before=@ saved_default=@ after=@ speed=@",
                                d.block.name, beforeLifetime, ad.lifetime, ad.bullet.lifetime, ad.bullet.speed);
                        }
                    }catch(eA){
                        Log.info("MOD_ENGINE_TURRET_DEBUG: ammo update threw @", eA);
                    }
                }
                if(d.ammoDefaults.length === 0 && (d.weaponAmmoDefaults == null || d.weaponAmmoDefaults.length === 0)){
                    Log.info("MOD_ENGINE_TURRET_DEBUG: block=@ has EMPTY ammoDefaults AND weaponAmmoDefaults (no bullet found at all!)", d.block.name);
                }

                if(d.weaponAmmoDefaults != null){
                    for(var wa = 0; wa < d.weaponAmmoDefaults.length; wa++){
                        var wad = d.weaponAmmoDefaults[wa];
                        try{
                            var wBefore = wad.bullet.lifetime;
                            if(wad.bullet.speed > 0) wad.bullet.lifetime = targetRange / wad.bullet.speed;
                            wad.bullet.maxRange = targetRange;
                            if(!loggedOnce){
                                loggedOnce = true;
                                Log.info("MOD_ENGINE_TURRET_DEBUG: (via weapons) block=@ lifetime before=@ saved_default=@ after=@ speed=@",
                                    d.block.name, wBefore, wad.lifetime, wad.bullet.lifetime, wad.bullet.speed);
                            }
                        }catch(eWA){
                            Log.info("MOD_ENGINE_TURRET_DEBUG: weapon-ammo update threw @", eWA);
                        }
                    }
                }
            }catch(e){
                Log.info("MOD_ENGINE_TURRET_DEBUG: block update threw @", e);
            }
        }
        if(!loggedOnce){
            Log.info("MOD_ENGINE_TURRET_DEBUG: WARNING - no ammo entries were ever processed across all @ turrets!", turretDefaults.length);
        }
    }

    function resetWeapons(){
        for(var i = 0; i < weaponDefaults.length; i++){
            var d = weaponDefaults[i];
            try{
                d.weapon.reload = d.reload;
                d.weapon.inaccuracy = d.inaccuracy;
                if(d.weapon.bullet != null){
                    d.weapon.bullet.damage = d.damage;
                    d.weapon.bullet.speed = d.speed;
                    d.weapon.bullet.lifetime = d.lifetime;
                }
            }catch(e){}
        }
    }

    function buffWeapons(){
        captureOriginals();
        for(var i = 0; i < weaponDefaults.length; i++){
            var d = weaponDefaults[i];
            try{
                d.weapon.reload = Math.max(1, d.reload * 0.48);
                d.weapon.inaccuracy = 0.5;
                if(d.weapon.bullet != null){
                    d.weapon.bullet.damage = Math.max(d.damage, 45);
                    if(d.weapon.bullet.speed > 0 && d.weapon.bullet.lifetime > 0){
                        d.weapon.bullet.lifetime = Math.max(d.lifetime, d.lifetime * 1.2);
                    }
                }
            }catch(e){}
        }
    }

    function applyTeamInstantReload(enabled){
        if(!enabled) return;
        var team = playerTeam();
        if(team == null) return;
        try{
            var data = team.data();
            if(data == null || data.units == null) return;
            var list = data.units;
            for(var i = 0; i < list.size; i++){
                try{
                    var unit = list.items[i];
                    if(unit == null) continue;
                    var mounts = null;
                    try{ mounts = unit.mounts(); }catch(eM){ try{ mounts = unit.mounts; }catch(eM2){} }
                    if(mounts == null) continue;
                    for(var m = 0; m < mounts.length; m++){
                        try{ mounts[m].reload = 0; }catch(eMount){}
                    }
                }catch(eInner){}
            }
        }catch(e){}
    }

    function healAllStructures(){
        try{
            Groups.build.each(cons(function(build){
                try{
                    if(build.team == playerTeam() || build.team() == playerTeam()){
                        build.health = build.maxHealth;
                    }
                }catch(e){
                    try{ build.heal(build.maxHealth); }catch(e2){}
                }
            }));
        }catch(e3){}
    }

    function killUnits(filter){
        try{
            Groups.unit.each(cons(function(unit){
                try{
                    if(filter == null || filter(unit)) unit.kill();
                }catch(e){}
            }));
        }catch(e2){}
    }

    function killBuildings(filter){
        try{
            Groups.build.each(cons(function(build){
                try{
                    if(filter == null || filter(build)) build.kill();
                }catch(e){}
            }));
        }catch(e2){}
    }

    function enemyFilterUnit(unit){
        try{
            return unit.team != playerTeam() && unit.team() != playerTeam();
        }catch(e){
            try{ return unit.team() != playerTeam(); }catch(e2){ return false; }
        }
    }

    function enemyFilterBuilding(build){
        try{
            var same = build.team == playerTeam() || build.team() == playerTeam();
            if(same) return false;
        }catch(e){}
        try{
            return !(build.block instanceof CoreBlock);
        }catch(e2){
            return true;
        }
    }

    function forceRules(){
        try{
            Vars.state.rules.waveSending = true;
            Vars.state.rules.waves = true;
        }catch(e){}
    }

    function applyPlayerStatus(command){
        var unit = playerUnit();
        if(unit == null) return;
        try{
            if(command === "player:status:overdrive" || command === "player:status:fast") unit.apply(StatusEffects.overclock, 60 * 20);
            if(command === "player:status:invincible"){
                unit.health = unit.maxHealth;
                try{ unit.shield = Math.max(unit.shield, 5000); }catch(e2){}
            }
            if(command === "player:status:burning") unit.apply(StatusEffects.burning, 60 * 10);
            if(command === "player:status:freezing") unit.apply(StatusEffects.freezing, 60 * 10);
            if(command === "player:status:shocked") unit.apply(StatusEffects.shocked, 60 * 10);
            if(command === "player:status:corroded") unit.apply(StatusEffects.corroded, 60 * 10);
            if(command === "player:status:cloaked") unit.apply(StatusEffects.unmoving, 60 * 8);
        }catch(e){
            notify("STATUS APPLY FAILED");
        }
    }

    function teamOf(unit){
        try{ return unit.team(); }catch(e){ try{ return unit.team; }catch(e2){ return playerTeam(); } }
    }

    function setUnitTeam(unit, team){
        try{ unit.team(team); return; }catch(e){}
        try{ unit.team = team; }catch(e2){}
    }

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
        if(cmd === "mining:applyGlobalBuffs"){
            var mineTarget = playerUnit();
            var mineItem = null;
            try{ mineItem = Vars.content.item(ui != null && ui.state != null ? ui.state.selectedMiningTarget : "titanium"); }catch(eItem){}
            if(mineTarget == null){
                notify("NO CONTROLLED UNIT");
                if(ui != null && ui.state != null) ui.state.miningProtocolActive = false;
                return;
            }
            if(mineItem == null){
                notify("INVALID ORE TARGET");
                return;
            }
            var mineOk = commandUnitMine(mineTarget, mineItem, true);
            if(ui != null && ui.state != null){
                ui.state.miningProtocolActive = mineOk;
                try{ Vars.state.rules.unitMineSpeedMultiplier = Math.max(1, ui.state.miningSpeed); }catch(eSpd){}
                try{ Vars.state.rules.buildSpeedMultiplier = ui.state.miningDrillBoost ? 2 : 1; }catch(eBld){}
            }
            if(mineOk){
                notify("UNIT MINING: " + mineItem.localizedName);
            }else{
                var capMsg = "NO ORE FOUND NEARBY";
                try{
                    if(mineTarget.type != null && mineItem.hardness > mineTarget.type.mineTier){
                        capMsg = "UNIT MINE TIER TOO LOW FOR " + mineItem.localizedName;
                    }
                }catch(eCap){}
                notify(capMsg);
            }
            return;
        }
        if(cmd === "mining:stopProtocol"){
            clearUnitMining(playerUnit(), true);
            if(ui != null && ui.state != null){
                ui.state.miningProtocolActive = false;
            }
            notify("MINING PROTOCOL STOPPED");
            return;
        }
        if(cmd.indexOf("mining:priority:") === 0){
            var priorityName = cmd.substring("mining:priority:".length);
            if(ui != null && ui.state != null && ui.state.miningProtocolActive){
                var priorityItem = null;
                try{ priorityItem = Vars.content.item(priorityName); }catch(ePr){}
                if(priorityItem != null){
                    var reOk = commandUnitMine(playerUnit(), priorityItem, true);
                    notify(reOk ? ("MINING PRIORITY: " + priorityName.toUpperCase()) : "NO ORE FOUND NEARBY");
                    return;
                }
            }
            notify("MINING PRIORITY: " + priorityName.toUpperCase());
            return;
        }
        if(cmd === "mining:fleetToggleItem"){
            var fleetType = payload.unitType == null ? null : String(payload.unitType);
            var fleetItemName = payload.item == null ? null : String(payload.item);
            var enabled = !!payload.enabled;
            if(fleetType == null){
                notify("NO UNIT TYPE SELECTED");
                return;
            }
            var fleetItem = null;
            try{ fleetItem = Vars.content.item(fleetItemName); }catch(eFI){}
            if(fleetItem == null){
                notify("INVALID ORE TARGET");
                return;
            }
            var fleetTeam = playerTeam();
            var fleetCount = countFleetUnits(fleetType, fleetTeam);
            if(fleetCount === 0){
                notify("NO UNITS OF THIS TYPE ON MAP");
                return;
            }
            var fleetSample = null;
            eachFleetUnit(fleetType, fleetTeam, function(u){ if(fleetSample == null) fleetSample = u; });
            try{
                if(enabled && fleetSample != null && fleetSample.type != null && fleetItem.hardness > fleetSample.type.mineTier){
                    notify("UNIT MINE TIER TOO LOW FOR " + fleetItem.localizedName);
                    return;
                }
            }catch(eCapFleet){}

            var currentList = fleetAssignments[fleetType];
            if(!Array.isArray(currentList)) currentList = currentList ? [currentList] : [];
            var pos = currentList.indexOf(fleetItemName);
            if(enabled && pos === -1) currentList.push(fleetItemName);
            if(!enabled && pos !== -1) currentList.splice(pos, 1);
            if(currentList.length === 0){
                delete fleetAssignments[fleetType];
            }else{
                fleetAssignments[fleetType] = currentList;
            }

            var fleetAssigned = toggleFleetMiningItem(fleetType, fleetItem, enabled, fleetTeam);
            notify((enabled ? "ADDED " : "REMOVED ") + fleetItem.localizedName.toUpperCase() + " (" + fleetAssigned + " UNITS, " + currentList.length + " ORES ACTIVE)");
            return;
        }
        if(cmd === "mining:fleetClear"){
            var clearType = payload.unitType == null ? null : String(payload.unitType);
            if(clearType == null) return;
            delete fleetAssignments[clearType];
            clearFleetMining(clearType, playerTeam());
            notify("FLEET MINING CLEARED");
            return;
        }
        if(cmd.indexOf("links:") === 0){
            notify("LINK EXEC: " + cmd.substring(6));
            return;
        }
        if(cmd.indexOf("console:") === 0){
            var scripts = scriptsApi();
            if(cmd === "console:clearLog"){
                if(ui != null && ui.state != null) ui.state.consoleLines = [];
                try{ if(ui != null && ui.state != null && ui.state.tab === "console") ui.rebuild(); }catch(e){}
                notify("CONSOLE CLEARED");
                return;
            }
            if(cmd === "console:exportTrace"){
                try{
                    var out = ui != null && ui.state != null && ui.state.consoleLines != null ? ui.state.consoleLines.join("\n") : "";
                    Core.app.setClipboardText(out);
                    notify("TRACE COPIED");
                }catch(e2){
                    notify("TRACE EXPORT FAILED");
                }
                return;
            }
            if(cmd === "console:runProtocol"){
                try{
                    var text = payload.text;
                    if(text == null || String(text).length === 0) return;
                    appendConsole(") " + text);
                    var result = "Scripts unavailable";
                    try{
                        if(scripts != null) result = scripts.runConsole(String(text));
                    }catch(ex){
                        result = "Exception: " + ex;
                    }
                    appendConsole("<- " + result);
                }catch(e3){
                    notify("CONSOLE EXEC FAILED");
                }
                return;
            }
            if(cmd.indexOf("console:alias:") === 0){
                var alias = cmd.substring("console:alias:".length);
                var sample = alias + ".toString()";
                appendConsole(") " + sample);
                var aliasResult = "Scripts unavailable";
                try{
                    if(scripts != null) aliasResult = scripts.runConsole(sample);
                }catch(ex2){
                    aliasResult = "Exception: " + ex2;
                }
                appendConsole("<- " + aliasResult);
                return;
            }
            notify("CONSOLE EXEC: " + cmd.substring(8));
            return;
        }
        if(cmd.indexOf("hotkeys:") === 0){
            if(cmd === "hotkeys:saveExit"){
                try{ if(ui != null) ui.hide(); }catch(e){}
            }
            notify("HOTKEYS EXEC: " + cmd.substring(8));
            return;
        }

        notify("COMMAND: " + cmd);
    }

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