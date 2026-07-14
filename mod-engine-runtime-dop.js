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