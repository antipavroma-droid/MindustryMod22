function buildUnitDetails(unitType, worldUnit){
        var s = getStyles();
        var p = panel(s.d.panelStrong, gap.lg);
        var name = unitType == null ? "NO_UNIT" : String(unitType.localizedName).toUpperCase();
        var icon = unitType == null ? getIcon("units", "factory") : regionDrawable(unitType.uiIcon);
        var dps = unitStatDps(unitType);
        var burst = unitStatBurst(unitType);

        var head = new Table();
        head.left().top();
        head.image(icon).size(64).padRight(gap.md);
        var headText = new Table();
        headText.left();
        headText.add(label(name, s.labelCyan, 0.96)).left().row();
        var metaLabel = label("ID: " + (worldUnit == null ? "N/A" : worldUnit.id) + "  *  TIER " + (unitType == null ? "?" : unitTier(unitType)), s.labelMuted, 0.68);
        headText.add(metaLabel).left().padTop(gap.xs);
        head.add(headText).growX().left();
        p.add(head).growX().row();

        var hpValueLabel = label("0", s.label, 0.78);
        var dpsInitialText = Math.round(dps) + "";
        var dpsValueLabel = label(dpsInitialText, s.label, gaugeValueScale(dpsInitialText, 0.78));
        var gauges = new Table();

        var hpGauge = new Stack();
        var hpBack = new Table();
        hpBack.background(makeDrawable(theme.panel2, theme.lineSoft, 1, null, false));
        var hpArc = new Table();
        hpArc.background(dynamicGaugeDrawable(function(){
            var maxHp = Math.max(1, unitStatMax(unitType, worldUnit));
            var hp = Math.max(0, unitStatValue(unitType, worldUnit));
            return hp / maxHp;
        }, theme.green));
        var hpText = new Table();
        hpText.center();
        hpText.add(hpValueLabel).center().row();
        hpText.add(label("HP", s.labelMuted, 0.54)).center().padTop(gap.xs);
        hpGauge.add(hpBack);
        hpGauge.add(hpArc);
        hpGauge.add(hpText);

        var dpsGauge = new Stack();
        var dpsBack = new Table();
        dpsBack.background(makeDrawable(theme.panel2, theme.lineSoft, 1, null, false));
        var dpsArc = new Table();
        dpsArc.background(dynamicGaugeDrawable(function(){
            return Math.min(1, unitStatDps(unitType) / 1500);
        }, theme.red));
        var dpsText = new Table();
        dpsText.center();
        dpsText.add(dpsValueLabel).center().row();
        dpsText.add(label("DPS", s.labelMuted, 0.54)).center().padTop(gap.xs);
        dpsGauge.add(dpsBack);
        dpsGauge.add(dpsArc);
        dpsGauge.add(dpsText);

        gauges.add(hpGauge).size(86).padRight(gap.md);
        gauges.add(dpsGauge).size(86);
        p.add(gauges).center().padTop(gap.md).row();

        var moveLine = metricLine("MOV_SPEED", ((unitType != null && unitType.speed != null) ? unitType.speed.toFixed(2) : "0.00") + " T/SEC", Math.min(1, (unitType != null ? unitType.speed : 0) / 10), theme.cyan);
        var burstLine = metricLine("BURST_DMG", String(Math.round(burst)), Math.min(1, burst / 1000), theme.red);
        p.add(moveLine).growX().padTop(gap.md).row();
        p.add(burstLine).growX().padTop(gap.sm).row();

        var actions = new Table();
        actions.left();
        actions.add(textButton("TELEPORT", s.primary, function(){ callHandler("unitAction", {action: "teleport", unitType: unitType, unit: worldUnit}); })).height(40).growX().padRight(gap.xs);
        actions.add(textButton("CLONE", s.action, function(){ callHandler("unitAction", {action: "clone", unitType: unitType, unit: worldUnit}); })).height(40).growX().row();
        actions.add(textButton("CHANGE_TEAM", s.action, function(){ callHandler("unitAction", {action: "team", unitType: unitType, unit: worldUnit}); })).height(40).growX().colspan(2).padTop(gap.xs).row();
        actions.add(textButton("DESTRUCT_UNIT", s.danger, function(){ callHandler("unitAction", {action: "destruct", unitType: unitType, unit: worldUnit}); })).height(40).growX().colspan(2).padTop(gap.sm);
        p.add(actions).growX().padTop(gap.md);

        p.update(run(function(){
            if(worldUnit == null) return;
            var hp = Math.max(0, unitStatValue(unitType, worldUnit));
            var hpText = Math.round(hp) + "";
            hpValueLabel.setText(hpText);
            hpValueLabel.setFontScale(gaugeValueScale(hpText, 0.78));
            var dpsText = Math.round(unitStatDps(unitType)) + "";
            dpsValueLabel.setText(dpsText);
            dpsValueLabel.setFontScale(gaugeValueScale(dpsText, 0.78));
            try{ metaLabel.setText("ID: " + worldUnit.id + "  *  TIER " + (unitType == null ? "?" : unitTier(unitType))); }catch(e){}
        }));
        return p;
    }

    function gaugeValueScale(text, baseScale){
        var len = String(text).length;
        if(len <= 3) return baseScale;
        if(len <= 5) return baseScale * 0.78;
        if(len <= 7) return baseScale * 0.6;
        return baseScale * 0.48;
    }

    function makeGauge(value, caption, percent, color){
        var s = getStyles();
        var stack = new Stack();
        var back = new Table();
        back.background(makeDrawable(theme.panel2, theme.lineSoft, 1, null, false));
        var gauge = new Table();
        gauge.background(gaugeDrawable(percent, color));
        var text = new Table();
        text.center();
        text.add(label(value, s.label, gaugeValueScale(value, 0.92))).center().row();
        text.add(label(caption, s.labelMuted, 0.62)).center().padTop(gap.sm);
        stack.add(back);
        stack.add(gauge);
        stack.add(text);
        return stack;
    }

    function collectWorldUnits(){
        var units = [];
        try{
            Groups.unit.each(cons(function(unit){
                units.push(unit);
            }));
        }catch(e){}
        return units;
    }

    function worldUnitCountCheap(){
        try{ return Groups.unit.size(); }catch(e){ return -1; }
    }

    var unitCategoryNames = {
        AIR: ["flare","horizon","zenith","antumbra","eclipse","elude","avert","obviate","quell","disrupt"],
        AIR_SUPPORT: ["mono","poly","mega","quad","oct"],
        GROUND: ["dagger","mace","fortress","scepter","reign","stell","locus","precept","vanquish","conquer"],
        GROUND_SUPPORT: ["nova","pulsar","quasar","vela","corvus","alpha","beta","gamma","evoke","incite","emanate"],
        SPIDER: ["crawler","atrax","spiroct","arkyid","toxopid","merui","cleroi","anthicus","tecta","collaris"],
        NAVAL: ["risso","minke","bryde","sei","omura"],
        NAVAL_SUPPORT: ["retusa","oxynoe","cyerce","aegires","navanax"]
    };

    function inspectorBucket(unit){
        try{
            var type = unit.type;
            if(type == null) return "OTHER";
            var n = String(type.name).toLowerCase();
            for(var key in unitCategoryNames){
                var list = unitCategoryNames[key];
                for(var i = 0; i < list.length; i++){
                    if(list[i] === n) return key;
                }
            }
            var support = (type.weapons == null || type.weapons.size == 0 || type.mineTier >= 0 || type.buildSpeed > 0);
            if(type.naval) return support ? "NAVAL_SUPPORT" : "NAVAL";
            if(type.flying) return support ? "AIR_SUPPORT" : "AIR";
            if(type.legCount > 0) return "SPIDER";
            return support ? "GROUND_SUPPORT" : "GROUND";
        }catch(e){
            return "OTHER";
        }
    }

    function inspectorIsEnemy(unit){
        try{
            var pt = playerTeamRef();
            if(pt == null) return false;
            var ut = null;
            try{ ut = unit.team(); }catch(eT){ try{ ut = unit.team; }catch(eT2){} }
            return ut != null && ut != pt;
        }catch(e){
            return false;
        }
    }

    function playerTeamRef(){
        try{ return Vars.player == null ? null : Vars.player.team(); }catch(e){ return null; }
    }

    function inspectorSections(units){
        var data = {
            ENEMY: [],
            AIR: [],
            AIR_SUPPORT: [],
            GROUND: [],
            GROUND_SUPPORT: [],
            SPIDER: [],
            NAVAL: [],
            NAVAL_SUPPORT: [],
            OTHER: []
        };
        for(var i = 0; i < units.length; i++){
            if(inspectorIsEnemy(units[i])){
                data.ENEMY.push(units[i]);
                continue;
            }
            var key = inspectorBucket(units[i]);
            if(data[key] == null) data[key] = [];
            data[key].push(units[i]);
        }
        return data;
    }

    function inspectorCategoryLabel(key){
        if(key === "ENEMY") return "ENEMY_CONTACTS";
        if(key === "AIR") return "AIR";
        if(key === "AIR_SUPPORT") return "AIR_SUPPORT";
        if(key === "GROUND") return "GROUND";
        if(key === "GROUND_SUPPORT") return "GROUND_SUPPORT";
        if(key === "SPIDER") return "SPIDER";
        if(key === "NAVAL") return "NAVAL";
        if(key === "NAVAL_SUPPORT") return "NAVAL_SUPPORT";
        return "OTHER";
    }

    function deploymentRow(unit){
        var s = getStyles();
        var row = new Button(s.tile);
        row.left();
        row.clicked(run(function(){
            state.selectedWorldUnit = unit;
            try{ state.selectedUnit = unit.type; }catch(e){}
            callHandler("unitAction", {action: "select", unit: unit});
            rebuildContent();
        }));
        try{
            row.image(regionDrawable(unit.type.uiIcon)).size(52).padRight(gap.md);
        }catch(e){
            row.image(getIcon("units", "factory")).size(52).padRight(gap.md);
        }
        var info = new Table();
        info.left();
        var unitName = "UNIT";
        try{ unitName = String(unit.type.localizedName).toUpperCase() + " #" + unit.id; }catch(e){}
        var unitLabel = label(unitName, s.labelGold, 0.82);
        info.add(unitLabel).left().row();

        var hpLine = new Table();
        hpLine.left();
        var hpTextLine = new Table();
        var teamLabel = label("TEAM: ?", s.labelMuted, 0.78);
        var hpPercentLabel = label("0% HP", s.labelGold, 0.78);
        hpTextLine.add(teamLabel).left().growX();
        hpTextLine.add(hpPercentLabel).right();
        hpLine.add(hpTextLine).growX().row();
        var hpBar = new Table();
        var barRatio = 1;
        var barColor = theme.green;
        hpBar.background(dynamicProgressDrawable(function(){ return barRatio; }, function(){ return barColor; }));
        hpLine.add(hpBar).growX().height(7).padTop(gap.sm);
        info.add(hpLine).growX().padTop(gap.sm);
        row.add(info).growX();

        var lastHpText = null;
        var lastTeamText = null;
        function refreshHpLine(){
            var hp = 1;
            var max = 1;
            var teamName = "TEAM";
            try{ hp = unit.health; max = unit.maxHealth; }catch(e){}
            try{ teamName = String(unit.team()); }catch(e2){ try{ teamName = String(unit.team); }catch(e3){} }
            barRatio = hp / Math.max(1, max);
            var isEnemy = inspectorIsEnemy(unit);
            barColor = isEnemy ? theme.red : (barRatio < 0.35 ? theme.red : theme.green);
            var teamText = "TEAM: " + teamName;
            if(teamText !== lastTeamText){
                lastTeamText = teamText;
                teamLabel.setText(teamText);
            }
            var hpText = Math.round(barRatio * 100) + "% HP";
            if(hpText !== lastHpText){
                lastHpText = hpText;
                hpPercentLabel.setText(hpText);
            }
        }
        refreshHpLine();

        var rowDead = false;
        var rowUpdateTimer = 0;
        row.update(run(function(){
            // Not every frame - HP/status don't need 60 updates/sec, ~10/sec (every 6 frames)
            // is plenty visually and drastically cuts cost when hundreds of rows exist at once.
            rowUpdateTimer++;
            if(rowUpdateTimer < 6) return;
            rowUpdateTimer = 0;
            var dead = false;
            try{ dead = unit.dead || unit.health <= 0; }catch(e){}
            if(dead){
                if(!rowDead){
                    rowDead = true;
                    row.visible = false;
                    try{ if(state.selectedWorldUnit === unit) state.selectedWorldUnit = null; }catch(e2){}
                }
                return;
            }
            refreshHpLine();
        }));
        return row;
    }

    function inspectorPlaceholder(){
        var s = getStyles();
        var p = panel(s.d.panelStrong, gap.xl);
        p.add(label("UNIT ACTION PANEL", s.labelGold, 1.18)).left().row();
        p.add(wrappedLabel("Select any unit from the inspector list to open contextual actions: teleport, clone, change team, or destroy.", s.labelMuted, 0.9)).width(textBlockWidth(420)).left().padTop(gap.md).row();
        p.add(label("AWAITING_SELECTION", s.labelCyan, 1.08)).left().padTop(gap.xl);
        return p;
    }