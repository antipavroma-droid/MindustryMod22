function refreshItemStatus(){
            var sel = state.selectedItem;
            selectedNameLabel.setText(sel != null ? String(sel.localizedName).toUpperCase() : "NO_ITEM_SELECTED");
            var flow = getCoreItemFlow();
            var key = sel != null ? String(sel.name) : null;
            var amount = key != null ? Math.round(flow.totals[key] || 0) : 0;
            var rate = key != null ? Math.round(flow.rates[key] || 0) : 0;
            storedRatio = Math.min(1, amount / 1000);
            storedValueLabel.setText(String(amount));
            flowRatio = Math.min(1, Math.abs(rate) / 50);
            flowIsNegative = rate < 0;
            var rateText = (rate > 0 ? "+" : "") + rate + " / SEC";
            flowValueLabel.setText(rateText);
            flowValueLabel.setStyle(flowIsNegative ? s.labelRed : s.labelCyan);
        }
        refreshItemStatus();
        status.update(run(function(){
            refreshItemStatus();
        }));

        var commands = panel(s.d.panelCyan, gap.lg);
        commands.add(label("BATCH_COMMANDS", s.labelCyan, 0.82)).left().row();
        var commandRow = new Table();
        commandRow.left();
        if(state.compact){
            addCommandButton(commandRow, "FILL_ALL_ITEMS", "fillAllItems");
            commandRow.row();
            addCommandButton(commandRow, "CLEAR_CORE_STORAGE", "clearCoreStorage");
            commandRow.row();
            addCommandButton(commandRow, "DUMP_TO_GROUND", "dumpToGround");
            commandRow.row();
            addCommandButton(commandRow, "LOCK_STORAGE_VALS", "lockStorageVals");
        }else{
            addCommandButton(commandRow, "FILL_ALL_ITEMS", "fillAllItems");
            addCommandButton(commandRow, "CLEAR_CORE_STORAGE", "clearCoreStorage");
            addCommandButton(commandRow, "DUMP_TO_GROUND", "dumpToGround");
            commandRow.row();
            addCommandButton(commandRow, "LOCK_STORAGE_VALS", "lockStorageVals");
        }
        commands.add(commandRow).left().padTop(gap.lg);

        if(state.compact){
            bottom.add(status).growX().row();
            bottom.add(commands).growX().padTop(gap.lg);
        }else{
            bottom.add(status).width(360).height(180).padRight(gap.lg);
            bottom.add(commands).growX().height(180);
        }
        parent.add(bottom).growX().padTop(gap.xl).row();
    }

    function addCommandButton(table, text, command){
        table.add(textButton(text, getStyles().action, function(){ callHandler("command", {command: command}); })).height(46).minWidth(180).padRight(gap.md).padBottom(gap.md);
    }

    function getUnits(){
        var result = [];
        eachSeq(Vars.content.units(), function(unit){
            if(visibleContent(unit)) result.push(unit);
        });
        return result;
    }

    var unitTierTable = {
        alpha: 1, dagger: 1, nova: 1, crawler: 1, flare: 1, mono: 1, risso: 1, retusa: 1,
        beta: 2, mace: 2, pulsar: 2, atrax: 2, horizon: 2, poly: 2, minke: 2, oxynoe: 2,
        gamma: 3, fortress: 3, quasar: 3, spiroct: 3, zenith: 3, mega: 3, bryde: 3, cyerce: 3,
        scepter: 4, vela: 4, arkyid: 4, antumbra: 4, quad: 4, sei: 4, aegires: 4,
        reign: 5, corvus: 5, toxopid: 5, eclipse: 5, oct: 5, omura: 5, navanax: 5,
        evoke: 1, stell: 1, merui: 1, elude: 1,
        incite: 2, locus: 2, cleroi: 2, avert: 2,
        emanate: 3, precept: 3, anthicus: 3, obviate: 3,
        vanquish: 4, tecta: 4, quell: 4,
        conquer: 5, collaris: 5, disrupt: 5,
        latum: 4, renale: 5
    };

    function unitTier(unit){
        try{
            var n = String(unit.name).toLowerCase();
            if(unitTierTable[n] != null) return unitTierTable[n];
        }catch(eName){}
        var hp = 100;
        try{ hp = unit.health; }catch(e){}
        if(hp < 350) return 1;
        if(hp < 1100) return 2;
        if(hp < 3500) return 3;
        if(hp < 11000) return 4;
        return 5;
    }

    function findUnitTypeByName(name){
        var result = null;
        eachSeq(Vars.content.units(), function(unit){
            try{
                if(result == null && String(unit.name) === String(name)) result = unit;
            }catch(e){}
        });
        return result;
    }

    function orderedUnitsByTier(filter, tier){
        var order = {
            serpulo: {
                1: ["alpha", "dagger", "nova", "crawler", "flare", "mono", "risso", "retusa"],
                2: ["beta", "mace", "pulsar", "atrax", "horizon", "poly", "minke", "oxynoe"],
                3: ["gamma", "fortress", "quasar", "spiroct", "zenith", "mega", "bryde", "cyerce"],
                4: ["scepter", "vela", "arkyid", "antumbra", "quad", "sei", "aegires"],
                5: ["reign", "corvus", "toxopid", "eclipse", "oct", "omura", "navanax"]
            },
            erekir: {
                1: ["evoke", "stell", "merui", "elude"],
                2: ["incite", "locus", "cleroi", "avert"],
                3: ["emanate", "precept", "anthicus", "obviate"],
                4: ["vanquish", "tecta", "quell"],
                5: ["conquer", "collaris", "disrupt"]
            },
            special: {
                4: ["latum"],
                5: ["renale"]
            }
        };
        var names = [];
        if(filter === "all"){
            names = (order.serpulo[tier] || []).concat(order.erekir[tier] || []).concat(order.special[tier] || []);
        }else if(filter === "serpulo"){
            names = order.serpulo[tier] || [];
        }else if(filter === "erekir"){
            names = order.erekir[tier] || [];
        }
        var result = [];
        for(var i = 0; i < names.length; i++){
            var unit = findUnitTypeByName(names[i]);
            if(unit != null && visibleContent(unit)) result.push(unit);
        }
        return result;
    }

    function unitPlanetGroup(unit){
        try{
            var n = String(unit.name);
            var serpulo = ["alpha","beta","gamma","dagger","mace","fortress","scepter","reign","nova","pulsar","quasar","vela","corvus","crawler","atrax","spiroct","arkyid","toxopid","flare","horizon","zenith","antumbra","eclipse","mono","poly","mega","quad","oct","risso","minke","bryde","sei","omura","retusa","oxynoe","cyerce","aegires","navanax"];
            for(var i = 0; i < serpulo.length; i++) if(serpulo[i] === n) return "serpulo";
            return "erekir";
        }catch(e){}
        return "serpulo";
    }

    function makeTierTabs(){

        var s = getStyles();
        var tabs = new Table();
        tabs.left();
        for(var i = 1; i <= 5; i++){
            (function(tier){
                var b = textButton("T" + tier, s.tab, function(){
                    state.tier = tier;
                    rebuildContent();
                });
                b.setChecked(state.tier === tier);
                tabs.add(b).width(60).height(44).padRight(gap.sm);
            })(i);
        }
        return tabs;
    }

    function makeUnitButton(unit, onClick){
        var s = getStyles();
        var b = new Button(s.tile);
        b.top();
        b.setChecked(state.selectedUnit === unit);
        b.clicked(run(function(){
            if(state.selectedUnit !== unit){
                state.unitCustomHealth = null;
                state.unitCustomShield = null;
                state.unitCustomDamage = null;
            }
            state.selectedUnit = unit;
            if(onClick != null) onClick(unit);
            else callHandler("spawnUnit", {unit: unit});
            rebuildContent();
        }));
        b.image(regionDrawable(unit.uiIcon)).size(64).padTop(gap.md).row();
        b.add(label(String(unit.localizedName).toUpperCase(), s.labelMuted, 0.72)).center().padTop(gap.md);
        return b;
    }

    function buildUnits(parent){
        var s = getStyles();
        var main = panel(s.d.panel, gap.xl);
        var header = sectionHeader("UNIT SPAWNER", null, getIcon("add", "plus"));
        header.add(makeTierTabs()).right();
        main.add(header).growX().row();

        var controls = new Table();
        controls.left();
        var factionButtons = [
            ["ALL", "all"],
            ["SERPULO", "serpulo"],
            ["EREKIR", "erekir"]
        ];
        for(var fi = 0; fi < factionButtons.length; fi++){
            (function(text, value){
                var b = textButton(text, state.unitPlanetFilter === value ? s.primary : s.action, function(){
                    state.unitPlanetFilter = value;
                    rebuildContent();
                });
                b.setChecked(state.unitPlanetFilter === value);
                controls.add(b).height(42).minWidth(120).padRight(gap.sm);
            })(factionButtons[fi][0], factionButtons[fi][1]);
        }
        controls.add().width(gap.lg);
        var teamButton = textButton(state.unitSpawnEnemy ? "TEAM: ENEMY" : "TEAM: ALLY", state.unitSpawnEnemy ? s.danger : s.primary, function(){
            state.unitSpawnEnemy = !state.unitSpawnEnemy;
            rebuildContent();
        });
        teamButton.setChecked(state.unitSpawnEnemy);
        controls.add(teamButton).height(42).minWidth(150).padRight(gap.md);
        controls.add(textButton("-", s.action, function(){ state.unitSpawnAmount = Math.max(1, state.unitSpawnAmount - 1); rebuildContent(); })).size(42).padRight(gap.xs);
        controls.add(label("x" + state.unitSpawnAmount, s.labelCyan, 1.0)).width(70).center();
        controls.add(textButton("+", s.action, function(){ state.unitSpawnAmount = Math.min(100, state.unitSpawnAmount + 1); rebuildContent(); })).size(42).padLeft(gap.xs).padRight(gap.md);
        controls.add(textButton("SPAWN", s.primary, function(){
            if(state.selectedUnit != null) callHandler("spawnUnit", {unit: state.selectedUnit, amount: state.unitSpawnAmount, enemy: state.unitSpawnEnemy});
        })).height(42).minWidth(140);
        main.add(controls).left().padTop(gap.lg).row();

        var filtered = orderedUnitsByTier(state.unitPlanetFilter, state.tier);
        if(state.selectedUnit == null && filtered.length > 0) state.selectedUnit = filtered[0];

        var grid = new Table();
        grid.left().top();
        var cols = state.compact ? 3 : 5;
        for(var u = 0; u < filtered.length; u++){
            (function(unit, index){
                var b = makeUnitButton(unit, function(selected){});
                grid.add(b).minWidth(132).height(126).growX().padRight(gap.md).padBottom(gap.md);
                if((index + 1) % cols === 0) grid.row();
            })(filtered[u], u);
        }
        var gridPane = new ScrollPane(grid, getStyles().pane);
        gridPane.setScrollingDisabled(true, false);
        try{
            gridPane.setFadeScrollBars(false);
            gridPane.setOverscroll(false, false);
        }catch(e){}
        main.add(gridPane).growX().height(state.compact ? 460 : 520).padTop(gap.xl).row();

        var preview = buildUnitPreview(state.selectedUnit);
        if(state.compact){
            parent.add(main).growX().row();
            parent.add(preview).growX().padTop(gap.lg).row();
        }else{
            var split = new Table();
            split.top().left();
            split.add(main).growX().padRight(gap.xl);
            split.add(preview).width(420).top();
            parent.add(split).growX().row();
        }
    }

    function unitStatValue(unitType, worldUnit){
        try{ if(worldUnit != null) return worldUnit.health; }catch(e){}
        try{ if(unitType != null) return unitType.health; }catch(e2){}
        return 0;
    }

    function unitStatMax(unitType, worldUnit){
        try{ if(worldUnit != null) return worldUnit.maxHealth; }catch(e){}
        try{ if(unitType != null) return unitType.health; }catch(e2){}
        return 1;
    }

    function unitStatDps(unitType){
        try{ if(unitType != null) return unitType.estimateDps(); }catch(e){}
        return 0;
    }

    function unitStatBurst(unitType){
        try{
            if(unitType != null && unitType.weapons != null && unitType.weapons.size > 0){
                var weapon = unitType.weapons.first();
                if(weapon != null && weapon.bullet != null) return weapon.bullet.damage;
            }
        }catch(e){}
        return 0;
    }

    function buildUnitPreview(unitType){
        var s = getStyles();
        var p = panel(s.d.panelStrong, gap.xl);
        var name = unitType == null ? "NO_UNIT" : String(unitType.localizedName).toUpperCase();
        var icon = unitType == null ? getIcon("units", "factory") : regionDrawable(unitType.uiIcon);
        var hp = unitStatMax(unitType, null);
        var dps = unitStatDps(unitType);
        p.image(icon).size(110).padBottom(gap.lg).row();
        p.add(label(name, s.labelCyan, 1.08)).center().row();
        p.add(label("SPAWN PREVIEW", s.labelMuted, 0.74)).center().padTop(gap.sm).row();
        var gauges = new Table();
        gauges.add(makeGauge(Math.round(hp) + "", "BASE_HP", 1, theme.green)).size(132).padRight(gap.lg);
        gauges.add(makeGauge(Math.round(dps) + "", "EST_DPS", Math.min(1, dps / 1000), theme.red)).size(132);
        p.add(gauges).center().padTop(gap.xl).row();
        p.add(metricLine("MOV_SPEED", ((unitType != null && unitType.speed != null) ? unitType.speed.toFixed(2) : "0.00") + " T/SEC", Math.min(1, (unitType != null ? unitType.speed : 0) / 10), theme.cyan)).growX().padTop(gap.lg).row();
        p.add(metricLine("BURST_DMG", String(Math.round(unitStatBurst(unitType))), Math.min(1, unitStatBurst(unitType) / 1000), theme.red)).growX().padTop(gap.lg).row();

        var customPanel = panel(s.d.panel, gap.md);
        customPanel.add(label("CUSTOM STATS", s.labelGold, 0.78)).left().row();

        var hpRow = new Table();
        hpRow.left();
        hpRow.add(label("MAX_HP", s.labelMuted, 0.76)).left().growX();
        var hpField = inlineNumberField(state.unitCustomHealth != null ? state.unitCustomHealth : Math.round(hp), 1, 999999, s.labelCyan.fontColor, function(num){
            state.unitCustomHealth = num;
        });
        hpRow.add(hpField).width(110).right();
        customPanel.add(hpRow).growX().padTop(gap.sm).row();

        var shieldRow = new Table();
        shieldRow.left();
        shieldRow.add(label("SHIELD", s.labelMuted, 0.76)).left().growX();
        var shieldField = inlineNumberField(state.unitCustomShield != null ? state.unitCustomShield : 0, 0, 999999, s.labelCyan.fontColor, function(num){
            state.unitCustomShield = num;
        });
        shieldRow.add(shieldField).width(110).right();
        customPanel.add(shieldRow).growX().padTop(gap.sm).row();

        var damageBase = unitStatBurst(unitType);
        var damageRow = new Table();
        damageRow.left();
        damageRow.add(label("DAMAGE", s.labelMuted, 0.76)).left().growX();
        var damageField = inlineNumberField(state.unitCustomDamage != null ? state.unitCustomDamage : Math.round(damageBase), 0, 999999, s.labelCyan.fontColor, function(num){
            state.unitCustomDamage = num;
        });
        damageRow.add(damageField).width(110).right();
        customPanel.add(damageRow).growX().padTop(gap.sm).row();

        customPanel.add(textButton("APPLY_TO_" + name, s.primary, function(){
            if(unitType == null) return;
            callHandler("command", {
                command: "units:applyCustomStats",
                unitType: unitType,
                health: state.unitCustomHealth != null ? state.unitCustomHealth : Math.round(hp),
                shield: state.unitCustomShield != null ? state.unitCustomShield : 0,
                damage: state.unitCustomDamage != null ? state.unitCustomDamage : Math.round(damageBase)
            });
        })).growX().height(44).padTop(gap.md);

        p.add(customPanel).growX().padTop(gap.lg);
        return p;
    }