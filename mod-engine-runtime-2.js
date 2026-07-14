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