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
    }