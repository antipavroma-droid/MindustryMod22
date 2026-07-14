function buildWeapon(parent){
        var s = getStyles();
        var split = new Table();
        split.top().left();

        var global = panel(s.d.panelCyan, gap.xl);
        global.add(label("GLOBAL MODIFIERS", s.labelCyan, 1.1)).left().row();
        global.add(label("CORE OFFENSIVE PARAMETERS", s.labelDim, 0.72)).left().padTop(gap.sm).row();
        global.add(liveSliderBlock("GLOBAL DAMAGE MULTIPLIER", 1, 5, 0.1, state.weaponGlobalDamage, function(v){ return v.toFixed(1) + "x"; }, "1.0x", "3.0x", "5.0x", theme.cyan, function(v){ state.weaponGlobalDamage = v; })).growX().padTop(gap.xl).row();
        var crit = textButton(state.weaponCritEnabled ? "CRITICAL HIT CHANCE: ON" : "CRITICAL HIT CHANCE: OFF", state.weaponCritEnabled ? s.primary : s.action, function(){
            state.weaponCritEnabled = !state.weaponCritEnabled;
            callHandler("command", {command: "weapon:criticalChance", value: state.weaponCritEnabled});
            rebuildContent();
        });
        crit.setChecked(state.weaponCritEnabled);
        global.add(crit).growX().height(52).padTop(gap.lg).row();
        global.add(textButton("INSTAKILL PROBABILITY [LOCKED]", s.action, function(){ callHandler("command", {command: "weapon:instakillLocked"}); })).growX().height(52).padTop(gap.md).row();
        var info = panel(s.d.panel, gap.md);
        info.add(wrappedLabel("INFO: Global modifiers are applied to unit weapons only. Turret parameters are tuned separately in the turret control block.", s.labelMuted, 0.78)).width(state.compact ? textBlockWidth(420) : 280).left();
        global.add(info).growX().padTop(gap.lg);

        var params = panel(s.d.panelCyan, gap.xl);
        params.add(label("UNIT WEAPON PARAMETERS", s.labelCyan, 1.1)).left().row();
        params.add(label("FIELD UNIT CALIBRATION", s.labelDim, 0.72)).left().padTop(gap.sm).row();
        var instantReloadBtn = textButton(state.weaponInstantReload ? "INSTANT RELOAD: ON (0 reload)" : "INSTANT RELOAD: OFF", state.weaponInstantReload ? s.primary : s.action, function(){
            state.weaponInstantReload = !state.weaponInstantReload;
            rebuildContent();
        });
        instantReloadBtn.setChecked(state.weaponInstantReload);
        params.add(instantReloadBtn).growX().height(52).padTop(gap.xl).row();
        params.add(wrappedLabel("Sets reload to 0 (fastest possible) on your own team's units only. Enemy units of the same type are unaffected.", s.labelDim, 0.72)).growX().padTop(gap.sm).row();
        params.add(liveSliderBlock("BULLET DAMAGE", 1, 500, 1, state.weaponBulletDamage, function(v){ return v.toFixed(1) + " DM"; }, "1.0 DM", "", "500.0 DM", theme.cyan, function(v){ state.weaponBulletDamage = v; })).growX().padTop(gap.lg).row();
        params.add(liveSliderBlock("RANGE", 40, 1000, 1, state.weaponRange, function(v){ return Math.round(v) + "m"; }, "40m", "", "1000m", theme.cyan, function(v){ state.weaponRange = v; })).growX().padTop(gap.lg).row();
        params.add(liveSliderBlock("INACCURACY (SPREAD)", 0, 15, 0.1, state.weaponSpread, function(v){ return v.toFixed(1) + "°"; }, "FIXED", "", "15° SPREAD", theme.cyan, function(v){ state.weaponSpread = v; })).growX().padTop(gap.lg).row();
        var paramActions = new Table();
        paramActions.left();
        paramActions.add(textButton("APPLY_UNIT_CHANGES", s.primary, function(){
            callHandler("command", {command: state.weaponInstantReload ? "weapon:applyUnits" : "weapon:resetUnits"});
        })).height(54).minWidth(200).padRight(gap.md);
        paramActions.add(textButton("RESET_UNITS", s.action, function(){ callHandler("command", {command: "weapon:resetUnits"}); })).height(54).minWidth(160);
        params.add(paramActions).left().padTop(gap.xl);

        var right = new Table();
        right.top().left();
        var turret = panel(s.d.panelCyan, gap.xl);
        turret.add(label("GLOBAL TURRET CONTROL", s.labelCyan, 1.08)).left().row();
        turret.add(label("AUTOMATED DEFENSE OVERRIDE", s.labelDim, 0.72)).left().padTop(gap.sm).row();
        turret.add(liveSliderBlock("TURRET FIRE RATE", 0.2, 50, 0.1, state.turretReloadMult, function(v){ return v >= 50 ? "INSTANT (0 reload)" : ("x" + v.toFixed(1)); }, "x0.2", "", "INSTANT", theme.cyan, function(v){ state.turretReloadMult = v; })).growX().padTop(gap.xl).row();
        turret.add(liveSliderBlock("TURRET SPREAD (INACCURACY)", 0, 15, 0.1, state.turretSpread, function(v){ return v <= 0 ? "PERFECT (0 spread)" : (v.toFixed(1) + "°"); }, "PERFECT", "", "15° SPREAD", theme.cyan, function(v){ state.turretSpread = v; })).growX().padTop(gap.lg).row();
        turret.add(liveSliderBlock("TURRET RANGE BOOST", 0, 200, 1, state.turretRangeBoost, function(v){ return "+" + Math.round(v) + "%"; }, "0%", "", "200%", theme.cyan, function(v){ state.turretRangeBoost = v; })).growX().padTop(gap.lg).row();
        turret.add(liveSliderBlock("TURRET DAMAGE", 0, 500, 1, state.turretDamageBoost, function(v){ return "+" + Math.round(v) + "%"; }, "0%", "", "500%", theme.cyan, function(v){ state.turretDamageBoost = v; })).growX().padTop(gap.lg).row();
        turret.add(summaryCard("ACTIVE TURRETS", String(activeTurretCount()), s.label, s.d.panel)).width(state.compact ? textBlockWidth(280) : 220).height(92).padTop(gap.xl).left().row();
        var turretActions = new Table();
        turretActions.left();
        turretActions.add(textButton("APPLY_TURRET_CHANGES", s.primary, function(){ callHandler("command", {command: "weapon:applyTurrets"}); })).height(54).minWidth(220).padRight(gap.md);
        turretActions.add(textButton("RESET_TURRETS", s.action, function(){ callHandler("command", {command: "weapon:resetTurrets"}); })).height(54).minWidth(170);
        turret.add(turretActions).left().padTop(gap.lg);
        right.add(turret).growX().row();

        global.setClip(true);
        params.setClip(true);
        right.setClip(true);

        var stackWeapon = state.compact || ArcCore.graphics.getWidth() < 1850;
        if(stackWeapon){
            split.add(global).growX().row();
            split.add(params).growX().padTop(gap.lg).row();
            split.add(right).growX().padTop(gap.lg);
        }else{
            split.add(global).growX().minWidth(300).top().padRight(gap.lg);
            split.add(params).growX().minWidth(520).top().padRight(gap.lg);
            split.add(right).growX().minWidth(340).top();
        }
        parent.add(split).growX().row();
    }

    function buildMining(parent){
        var s = getStyles();
        parent.add(label("Extraction Protocol", s.label, 1.72)).left().row();
        parent.add(wrappedLabel("PROTOCOL: FLEET-WIDE RESOURCE HARVESTING. ASSIGN EACH MINING-CAPABLE UNIT TYPE ON THE MAP TO A TARGET ORE.", s.labelDim, 0.78)).width(textBlockWidth(900)).left().padTop(gap.sm).row();

        var split = new Table();
        split.top().left();

        var left = new Table();
        left.top().left();

        var drill = panel(s.d.panelCyan, gap.xl);
        drill.add(label("DRILL_OPTIMIZATION", s.label, 0.98)).left().row();
        var boost1 = textButton(state.miningDrillBoost ? "BUILD_SPEED_MULTIPLIER: ACTIVE" : "BUILD_SPEED_MULTIPLIER: INACTIVE", state.miningDrillBoost ? s.primary : s.action, function(){
            state.miningDrillBoost = !state.miningDrillBoost;
            callHandler("command", {command: "mining:buildBoost", value: state.miningDrillBoost});
            rebuildContent();
        });
        boost1.setChecked(state.miningDrillBoost);
        drill.add(boost1).growX().height(56).padTop(gap.xl).row();
        var boost2 = textButton(state.miningEfficiencyBoost ? "EXTRACTION_EFFICIENCY: ACTIVE" : "EXTRACTION_EFFICIENCY: INACTIVE", state.miningEfficiencyBoost ? s.primary : s.action, function(){
            state.miningEfficiencyBoost = !state.miningEfficiencyBoost;
            callHandler("command", {command: "mining:efficiency", value: state.miningEfficiencyBoost});
            rebuildContent();
        });
        boost2.setChecked(state.miningEfficiencyBoost);
        drill.add(boost2).growX().height(56).padTop(gap.md).row();
        drill.add(liveSliderBlock("GLOBAL_MINE_SPEED", 1, 12, 0.1, state.miningSpeed, function(v){ return "x" + v.toFixed(1); }, "", "", "", theme.cyan, function(v){
            state.miningSpeed = v;
            callHandler("command", {command: "mining:setSpeed", value: v});
        })).growX().padTop(gap.lg);
        left.add(drill).growX().row();

        var fleetTypes = collectFleetMinerTypes();
        var totalMiners = 0;
        var totalActive = 0;
        for(var ti = 0; ti < fleetTypes.length; ti++){
            totalMiners += fleetTypes[ti].count;
            totalActive += fleetTypes[ti].mining;
        }

        var summary = panel(s.d.panel, gap.lg);
        summary.add(label("FLEET_OVERVIEW", s.labelGold, 0.82)).left().row();
        var summaryRow = new Table();
        var minerCard = summaryCard("MINER_TYPES", String(fleetTypes.length), s.label, s.d.panel);
        var activeCard = summaryCard("UNITS_MINING", totalActive + " / " + totalMiners, s.label, s.d.panel);
        if(state.compact){
            summaryRow.add(minerCard).growX().height(90).row();
            summaryRow.add(activeCard).growX().height(90).padTop(gap.md);
        }else{
            summaryRow.add(minerCard).width(150).height(90).padRight(gap.md);
            summaryRow.add(activeCard).width(150).height(90);
        }
        summary.add(summaryRow).growX().padTop(gap.lg);
        left.add(summary).growX().padTop(gap.lg);

        var right = new Table();
        right.top().left();
        var fleetPanel = panel(s.d.panelCyan, gap.xl);
        fleetPanel.add(sectionHeader("MINING FLEET", "TAP AN ORE ICON TO ASSIGN", getIcon("pick", "hammer"))).growX().row();

        var resourceOptions = [
            findItemByName("copper"),
            findItemByName("lead"),
            findItemByName("coal"),
            findItemByName("scrap"),
            findItemByName("titanium"),
            findItemByName("thorium"),
            findItemByName("sand")
        ];

        if(fleetTypes.length === 0){
            fleetPanel.add(wrappedLabel("No mining-capable units detected on the map. Spawn or build units with mining ability (e.g. Mono, Poly, Mega) to assign extraction targets.", s.labelMuted, 0.86)).growX().padTop(gap.lg);
        }else{
            var fleetList = new Table();
            fleetList.top().left();
            var fleetCols = state.compact ? 1 : (ArcCore.graphics.getWidth() > 1700 ? 2 : 1);
            for(var fi = 0; fi < fleetTypes.length; fi++){
                fleetList.add(fleetMinerCard(fleetTypes[fi], resourceOptions)).growX().minWidth(state.compact ? 0 : 340).top().padRight(gap.md).padBottom(gap.md);
                if((fi + 1) % fleetCols === 0) fleetList.row();
            }
            var fleetPane = new ScrollPane(fleetList, getStyles().pane);
            fleetPane.setScrollingDisabled(true, false);
            try{
                fleetPane.setFadeScrollBars(false);
                fleetPane.setOverscroll(false, false);
            }catch(ePane){}
            fleetPanel.add(fleetPane).growX().height(state.compact ? 460 : 560).padTop(gap.lg);
        }
        right.add(fleetPanel).growX().row();

        left.setClip(true);
        right.setClip(true);

        if(state.compact){
            split.add(left).growX().row();
            split.add(right).growX().padTop(gap.lg);
        }else{
            split.add(left).growX().minWidth(340).top().padRight(gap.xl);
            split.add(right).growX().minWidth(420).top();
        }
        parent.add(split).growX().padTop(gap.xl).row();
    }

    function radiusRow(icon, name, tierLabel, value, unitSuffix, maxValue, color){
        var s = getStyles();
        var row = new Table();
        row.background(s.d.panel);
        row.margin(gap.md);
        row.left();
        try{
            row.image(icon).size(44).padRight(gap.md);
        }catch(eIcon){}
        var info = new Table();
        info.left();
        var head = new Table();
        head.left();
        head.add(label(name, s.labelGold, 0.86)).left().growX();
        if(tierLabel != null){
            head.add(label(tierLabel, s.labelMuted, 0.68)).right();
        }
        info.add(head).growX().row();
        var ratio = maxValue > 0 ? Math.min(1, value / maxValue) : 0;
        info.add(metricLine(Math.round(value) + " " + unitSuffix, Math.round(ratio * 100) + "%", ratio, color)).growX().padTop(gap.sm);
        row.add(info).growX();
        return row;
    }

    function radiusSection(parent, title, code, icon, entries, nameFn, iconFn, tierFn, color){
        var s = getStyles();
        var section = panel(s.d.panel, gap.lg);
        section.add(sectionHeader(title, code, icon)).growX().row();
        if(entries.length === 0){
            section.add(wrappedLabel("No entries found for this category.", s.labelMuted, 0.82)).growX().padTop(gap.lg);
        }else{
            var maxValue = entries[0].range;
            var list = new Table();
            list.top().left();
            for(var i = 0; i < entries.length; i++){
                var entry = entries[i];
                list.add(radiusRow(iconFn(entry), nameFn(entry), tierFn(entry), entry.range, "TILES", maxValue, color)).growX().padTop(i === 0 ? gap.lg : gap.sm).row();
            }
            var pane = new ScrollPane(list, s.pane);
            pane.setScrollingDisabled(true, false);
            try{
                pane.setFadeScrollBars(false);
                pane.setOverscroll(false, false);
            }catch(ePane){}
            section.add(pane).growX().height(state.compact ? 320 : 420).padTop(gap.sm);
        }
        parent.add(section).growX().row();
    }

    function buildRadius(parent){
        var s = getStyles();
        parent.add(label("Radius Overview", s.label, 1.72)).left().row();
        parent.add(wrappedLabel("REFERENCE: EFFECTIVE RANGE OF TURRETS AND UNITS CURRENTLY REGISTERED IN THIS SECTOR'S CONTENT DATABASE. VALUES ARE READ DIRECTLY FROM GAME DATA.", s.labelDim, 0.78)).width(textBlockWidth(900)).left().padTop(gap.sm).row();

        var overlay = panel(s.d.panelStrong, gap.lg);
        overlay.add(sectionHeader("MAP OVERLAY", "LIVE RANGE CIRCLES ON WORLD", getIcon("eye", "zoom"))).growX().row();
        overlay.add(wrappedLabel("Draws range circles directly on the map for quick visual reference while playing.", s.labelMuted, 0.8)).growX().padTop(gap.sm).row();
        var toggleRow = new Table();
        toggleRow.left();
        var turretToggle = textButton(state.showTurretRadii ? "TURRET RADII: ON" : "TURRET RADII: OFF", state.showTurretRadii ? s.primary : s.action, function(){
            callHandler("command", {command: "radius:toggleTurrets"});
            rebuildContent();
        });
        turretToggle.setChecked(state.showTurretRadii);
        toggleRow.add(turretToggle).height(50).growX().padRight(gap.md);
        var unitToggle = textButton(state.showUnitRadii ? "UNIT RADII: ON" : "UNIT RADII: OFF", state.showUnitRadii ? s.primary : s.action, function(){
            callHandler("command", {command: "radius:toggleUnits"});
            rebuildContent();
        });
        unitToggle.setChecked(state.showUnitRadii);
        toggleRow.add(unitToggle).height(50).growX();
        overlay.add(toggleRow).growX().padTop(gap.md);
        parent.add(overlay).growX().padTop(gap.lg).row();

        var turretEntries = collectTurretRanges();
        var weaponEntries = collectUnitWeaponRanges();
        var mineEntries = collectUnitMineRanges();

        radiusSection(parent, "TURRET RANGE", "COUNT: " + turretEntries.length, getIcon("commandAttack", "target"), turretEntries,
            function(e){ return String(e.block.localizedName).toUpperCase(); },
            function(e){ return regionDrawable(e.block.uiIcon); },
            function(e){ return null; },
            theme.red);

        radiusSection(parent, "UNIT WEAPON RANGE", "COUNT: " + weaponEntries.length, getIcon("units", "factory"), weaponEntries,
            function(e){ return String(e.type.localizedName).toUpperCase(); },
            function(e){ return regionDrawable(e.type.uiIcon); },
            function(e){ return "T" + unitTier(e.type); },
            theme.gold);

        radiusSection(parent, "UNIT MINING RANGE", "COUNT: " + mineEntries.length, getIcon("pick", "hammer"), mineEntries,
            function(e){ return String(e.type.localizedName).toUpperCase(); },
            function(e){ return regionDrawable(e.type.uiIcon); },
            function(e){ return "T" + unitTier(e.type); },
            theme.cyan);
    }


    function buildUtility(parent, id){
        var s = getStyles();
        var p = panel(s.d.panelStrong, gap.xl);
        p.add(label(id.toUpperCase() + " CONTROL", s.labelGold, 1.42)).left().row();
        p.add(wrappedLabel("This screen uses the same native style system and routes all actions to handlers without changing gameplay logic.", s.labelMuted, 0.92)).left().width(textBlockWidth(720)).padTop(gap.md).row();
        var row = new Table();
        row.left();
        if(state.compact){
            row.add(textButton("ENABLE_" + id.toUpperCase(), s.primary, function(){ callHandler("command", {command: id + ":enable"}); })).height(56).growX().row();
            row.add(textButton("SYNC_STATE", s.action, function(){ callHandler("command", {command: id + ":sync"}); })).height(56).growX().padTop(gap.md).row();
            row.add(textButton("RESET_VIEW", s.action, function(){ callHandler("command", {command: id + ":reset"}); })).height(56).growX().padTop(gap.md);
        }else{
            row.add(textButton("ENABLE_" + id.toUpperCase(), s.primary, function(){ callHandler("command", {command: id + ":enable"}); })).height(56).minWidth(220).padRight(gap.md);
            row.add(textButton("SYNC_STATE", s.action, function(){ callHandler("command", {command: id + ":sync"}); })).height(56).minWidth(180).padRight(gap.md);
            row.add(textButton("RESET_VIEW", s.action, function(){ callHandler("command", {command: id + ":reset"}); })).height(56).minWidth(180);
        }
        p.add(row).left().padTop(gap.xl).row();
        parent.add(p).growX().row();
    }

    function buildRoot(){
        var s = getStyles();
        state.compact = isCompact();
        root = new Table();
        root.background(s.d.screen);
        root.top().left();

        if(!state.compact){
            addSidebar(root);
        }

        var main = new Table();
        main.top().left();
        main.background(s.d.screen);
        addTopBar(main);
        if(state.compact){
            addCompactNav(main);
        }

        contentHost = new Table();
        contentHost.top().left();
        var pane = new ScrollPane(contentHost, s.pane);
        contentPane = pane;
        pane.setScrollingDisabled(true, false);
        try{
            pane.setFadeScrollBars(false);
            pane.setOverscroll(false, false);
        }catch(e){}
        var contentWrap = new Table();
        contentWrap.margin(state.compact ? gap.md : gap.xl);
        contentWrap.add(pane).grow();
        main.add(contentWrap).grow().row();
        addFooter(main);

        root.add(main).grow();
        rebuildContent();
    }

    function refreshRoot(){
        if(dialog == null) return;
        try{
            if(contentPane != null) savedScrollY = contentPane.getScrollY();
        }catch(e){}
        try{
            if(navScrollPane != null){
                savedNavScrollY = navScrollPane.getScrollY();
                savedNavScrollX = navScrollPane.getScrollX();
            }
        }catch(eNav){}
        dialog.cont.clear();
        buildRoot();
        dialog.cont.add(root).grow();
        try{
            ArcCore.app.post(run(function(){
                try{
                    if(contentPane != null) contentPane.setScrollY(savedScrollY);
                }catch(e2){}
                try{
                    if(navScrollPane != null){
                        navScrollPane.setScrollY(savedNavScrollY);
                        navScrollPane.setScrollX(savedNavScrollX);
                    }
                }catch(eNav2){}
            }));
        }catch(e3){}
    }

    function ensureDialog(){
        if(dialog != null) return dialog;
        dialog = new BaseDialog("");
        dialog.addCloseListener();
        try{
            dialog.titleTable.clear();
        }catch(e){}
        try{
            dialog.resized(run(function(){
                if(dialog != null && dialog.isShown()) refreshRoot();
            }));
        }catch(e2){}
        return dialog;
    }

    function show(){
        var d = ensureDialog();
        d.cont.clear();
        d.buttons.clear();
        d.setFillParent(true);
        d.cont.setFillParent(true);
        d.cont.margin(0);
        buildRoot();
        d.cont.add(root).grow();
        d.show();
    }

    function hide(){
        if(dialog != null) dialog.hide();
    }

    return {
        show: show,
        hide: hide,
        configure: configure,
        rebuild: function(){
            if(dialog == null) return;
            refreshRoot();
        },
        setTab: function(tab){
            state.tab = tab;
            refreshRoot();
        },
        state: state
    };
})();

module.exports = ModEngineUI;
})();