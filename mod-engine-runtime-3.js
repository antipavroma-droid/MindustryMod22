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