function buildInspector(parent){
        var s = getStyles();
        var units = collectWorldUnits();
        var sections = inspectorSections(units);
        var order = ["ENEMY", "AIR", "AIR_SUPPORT", "GROUND", "GROUND_SUPPORT", "SPIDER", "NAVAL", "NAVAL_SUPPORT", "OTHER"];

        if(state.selectedWorldUnit != null){
            var exists = false;
            for(var su = 0; su < units.length; su++){
                if(units[su] === state.selectedWorldUnit){
                    exists = true;
                    break;
                }
            }
            if(!exists) state.selectedWorldUnit = null;
        }

        var list = panel(s.d.panel, gap.xl);
        list.add(sectionHeader("ACTIVE DEPLOYMENTS", "COUNT: " + units.length, getIcon("list"))).growX().row();

        var inspectorWatchCount = worldUnitCountCheap();
        var inspectorWatchTimer = 0;
        list.update(run(function(){
            inspectorWatchTimer++;
            if(inspectorWatchTimer < 30) return;
            inspectorWatchTimer = 0;
            var nowCount = worldUnitCountCheap();
            // Rebuild is only needed when unit count INCREASES (a new spawn that isn't in
            // the card list yet). Deaths don't need a rebuild - deploymentRow already hides
            // itself via row.update(), without touching layout.
            if(nowCount > inspectorWatchCount){
                inspectorWatchCount = nowCount;
                rebuildContent();
            }else if(nowCount < inspectorWatchCount){
                // just resync the counter for future comparisons, no rebuild
                inspectorWatchCount = nowCount;
            }
        }));

        var controls = new Table();
        controls.left();
        for(var ti = 0; ti <= 5; ti++){
            (function(tier){
                var text = tier === 0 ? "ALL" : ("T" + tier);
                var b = textButton(text, state.inspectorTier === tier ? s.primary : s.action, function(){
                    state.inspectorTier = tier;
                    state.inspectorPage = 0;
                    rebuildContent();
                });
                b.setChecked(state.inspectorTier === tier);
                controls.add(b).height(40).minWidth(70).padRight(gap.sm);
            })(ti);
        }
        list.add(controls).left().padTop(gap.lg).row();

        var catControls = new Table();
        catControls.left();
        var cats = [["ALL","all"],["ENEMY","ENEMY"],["AIR","AIR"],["AIR_SUP","AIR_SUPPORT"],["GROUND","GROUND"],["GND_SUP","GROUND_SUPPORT"],["SPIDER","SPIDER"],["NAVAL","NAVAL"],["NAV_SUP","NAVAL_SUPPORT"]];
        for(var ci = 0; ci < cats.length; ci++){
            (function(text, value){
                var b = textButton(text, state.inspectorCategory === value ? s.primary : s.action, function(){
                    state.inspectorCategory = value;
                    state.inspectorPage = 0;
                    rebuildContent();
                });
                b.setChecked(state.inspectorCategory === value);
                catControls.add(b).height(40).minWidth(96).padRight(gap.sm).padTop(gap.sm);
            })(cats[ci][0], cats[ci][1]);
        }
        list.add(catControls).left().padTop(gap.sm).row();

        var planetControls = new Table();
        planetControls.left();
        var planets = [["ALL_PLANETS","all"],["SERPULO","serpulo"],["EREKIR","erekir"]];
        for(var pi2 = 0; pi2 < planets.length; pi2++){
            (function(text, value){
                var b = textButton(text, state.inspectorPlanet === value ? s.primary : s.action, function(){
                    state.inspectorPlanet = value;
                    state.inspectorPage = 0;
                    rebuildContent();
                });
                b.setChecked(state.inspectorPlanet === value);
                planetControls.add(b).height(40).minWidth(120).padRight(gap.sm).padTop(gap.sm);
            })(planets[pi2][0], planets[pi2][1]);
        }
        list.add(planetControls).left().padTop(gap.sm).row();

        if(units.length === 0){
            list.add(wrappedLabel("No active world units detected. The panel remains live and will populate when units spawn.", s.labelMuted, 0.86)).growX().padTop(gap.lg).row();
        }else{
            var cols = state.compact ? 1 : (ArcCore.graphics.getWidth() > 1700 ? 3 : 2);
            var PAGE_SIZE = Math.max(1, state.inspectorPageSize || 100);

            // Step 1: collect a FLAT filtered list of {key, entry} across all categories.
            // This renders nothing yet - it's just cheap reference filtering.
            var flat = [];
            for(var o = 0; o < order.length; o++){
                var key = order[o];
                var bucket = sections[key];
                if(bucket == null || bucket.length === 0) continue;
                if(state.inspectorCategory !== "all" && state.inspectorCategory !== key) continue;
                for(var bi = 0; bi < bucket.length; bi++){
                    if(state.inspectorTier !== 0 && unitTier(bucket[bi].type) !== state.inspectorTier) continue;
                    if(key !== "ENEMY" && state.inspectorPlanet !== "all" && unitPlanetGroup(bucket[bi].type) !== state.inspectorPlanet) continue;
                    flat.push({key: key, entry: bucket[bi]});
                }
            }

            var totalPages = Math.max(1, Math.ceil(flat.length / PAGE_SIZE));
            if(state.inspectorPage >= totalPages) state.inspectorPage = totalPages - 1;
            if(state.inspectorPage < 0) state.inspectorPage = 0;
            var pageStart = state.inspectorPage * PAGE_SIZE;
            var pageEnd = Math.min(flat.length, pageStart + PAGE_SIZE);
            var pageSlice = flat.slice(pageStart, pageEnd);

            // Current filter combination label - "EREKIR T1 AIR" / "ALL" etc.
            function currentGroupLabel(){
                var parts = [];
                if(state.inspectorPlanet !== "all") parts.push(state.inspectorPlanet.toUpperCase());
                if(state.inspectorTier !== 0) parts.push("T" + state.inspectorTier);
                if(state.inspectorCategory !== "all") parts.push(inspectorCategoryLabel(state.inspectorCategory));
                return parts.length ? parts.join(" ") : "ALL";
            }

            var groupBar = new Table();
            groupBar.left();
            groupBar.add(textButton("SELECT_GROUP: " + currentGroupLabel() + " (" + flat.length + ")", state.inspectorGroupOpen ? s.primary : s.action, function(){
                state.inspectorGroupOpen = !state.inspectorGroupOpen;
                rebuildContent();
            })).growX().height(46);
            list.add(groupBar).growX().padTop(gap.lg).row();

            if(state.inspectorGroupOpen){
                var groupUnitsRef = flat.map(function(f){ return f.entry; });
                var groupPanel = panel(s.d.panelStrong, gap.lg);
                groupPanel.add(label("GROUP ACTIONS: " + currentGroupLabel(), s.labelGold, 1.04)).left().row();
                groupPanel.add(label(groupUnitsRef.length + " UNITS MATCH CURRENT FILTER (ALL PAGES)", s.labelMuted, 0.78)).left().padTop(gap.sm).row();
                var groupActions = new Table();
                groupActions.left();
                groupActions.add(textButton("TELEPORT_GROUP", s.primary, function(){
                    callHandler("unitAction", {action: "groupTeleport", units: groupUnitsRef});
                })).height(44).growX().padRight(gap.xs);
                groupActions.add(textButton("CLONE_GROUP", s.action, function(){
                    callHandler("unitAction", {action: "groupClone", units: groupUnitsRef});
                })).height(44).growX().row();
                groupActions.add(textButton("CHANGE_TEAM_GROUP", s.action, function(){
                    callHandler("unitAction", {action: "groupTeam", units: groupUnitsRef});
                })).height(44).growX().colspan(2).padTop(gap.xs).row();
                groupActions.add(textButton("DESTRUCT_GROUP", s.danger, function(){
                    callHandler("unitAction", {action: "groupDestruct", units: groupUnitsRef});
                })).height(44).growX().colspan(2).padTop(gap.sm);
                groupPanel.add(groupActions).growX().padTop(gap.md);
                list.add(groupPanel).growX().padTop(gap.sm).row();
            }

            // Pagination controls - rendered BEFORE the list so you don't have to scroll down every time
            var pager = new Table();
            pager.left();
            var pagerPrev = textButton("< PREV", s.action, function(){
                if(state.inspectorPage > 0){ state.inspectorPage--; rebuildContent(); }
            });
            pager.add(pagerPrev).height(40).minWidth(100).padRight(gap.md);
            pager.add(label("PAGE " + (state.inspectorPage + 1) + " / " + totalPages, s.labelMuted, 0.78)).center().growX();
            var pagerNext = textButton("NEXT >", s.action, function(){
                if(state.inspectorPage < totalPages - 1){ state.inspectorPage++; rebuildContent(); }
            });
            pager.add(pagerNext).height(40).minWidth(100).padLeft(gap.md).padRight(gap.lg);
            pager.add(label("PER_PAGE", s.labelMuted, 0.74)).padRight(gap.sm);
            var pageSizeField = inlineNumberField(PAGE_SIZE, 1, 1000, s.labelCyan.fontColor, function(num){
                state.inspectorPageSize = num;
                state.inspectorPage = 0;
                rebuildContent();
            });
            pager.add(pageSizeField).width(90);
            list.add(pager).growX().padTop(gap.lg).row();

            // Step 2: render ONLY the current page's slice (max 100 cards), not all 1000+ units at once.
            // Category header shown whenever the key changes within the slice.
            var grid = null;
            var currentKey = null;
            var indexInGroup = 0;
            var selectedRow = -1;
            var selectedEntry = null;
            var groupLength = 0;

            function countKeyInSlice(key, fromIdx){
                var c = 0;
                for(var q = fromIdx; q < pageSlice.length && pageSlice[q].key === key; q++) c++;
                return c;
            }

            for(var i = 0; i < pageSlice.length; i++){
                var item = pageSlice[i];
                if(item.key !== currentKey){
                    if(grid != null) list.add(grid).growX().row();
                    currentKey = item.key;
                    indexInGroup = 0;
                    groupLength = countKeyInSlice(currentKey, i);
                    list.add(label(inspectorCategoryLabel(currentKey), s.labelCyan, 0.82)).left().padTop(gap.lg).row();
                    grid = new Table();
                    grid.left().top();
                    selectedRow = -1;
                    selectedEntry = null;
                }
                var current = item.entry;
                if(state.selectedWorldUnit === current){
                    selectedRow = Math.floor(indexInGroup / cols);
                    selectedEntry = current;
                }
                grid.add(deploymentRow(current)).growX().height(92).minWidth(state.compact ? 0 : 310).padRight(gap.md).padBottom(gap.md);
                if((indexInGroup + 1) % cols === 0) grid.row();
                if(selectedRow >= 0 && Math.floor(indexInGroup / cols) === selectedRow && ((indexInGroup + 1) % cols === 0 || indexInGroup === groupLength - 1)){
                    grid.row();
                    var detailWrap = new Table();
                    detailWrap.left();
                    detailWrap.add(buildUnitDetails(selectedEntry.type, selectedEntry)).width(state.compact ? textBlockWidth(360) : 340).left();
                    grid.add(detailWrap).left().colspan(cols).padTop(gap.sm).padBottom(gap.md).row();
                    selectedRow = -2;
                }
                indexInGroup++;
            }
            if(grid != null) list.add(grid).growX().row();

            if(totalPages > 1){
                var pagerBottom = new Table();
                pagerBottom.left();
                pagerBottom.add(textButton("< PREV", s.action, function(){
                    if(state.inspectorPage > 0){ state.inspectorPage--; rebuildContent(); }
                })).height(40).minWidth(100).padRight(gap.md);
                pagerBottom.add(label("PAGE " + (state.inspectorPage + 1) + " / " + totalPages, s.labelMuted, 0.78)).center().growX();
                pagerBottom.add(textButton("NEXT >", s.action, function(){
                    if(state.inspectorPage < totalPages - 1){ state.inspectorPage++; rebuildContent(); }
                })).height(40).minWidth(100).padLeft(gap.md);
                list.add(pagerBottom).growX().padTop(gap.lg).row();
            }
        }

        if(state.selectedWorldUnit == null){
            list.add(inspectorPlaceholder()).growX().padTop(gap.lg).row();
        }
        parent.add(list).growX().row();
    }

    function pill(text, drawable, labelStyle){
        var t = new Table();
        t.background(drawable || getStyles().d.actionUp);
        t.margin(gap.sm);
        t.add(label(text, labelStyle || getStyles().labelGold, 0.76)).left();
        return t;
    }

    function summaryCard(title, value, valueStyle, drawable){
        var s = getStyles();
        var t = panel(drawable || s.d.panel, gap.md);
        t.add(label(title, s.labelMuted, 0.72)).left().row();
        t.add(label(value, valueStyle || s.labelGold, 1.32)).left().padTop(gap.xs);
        return t;
    }

    function buildMassActionCard(title, caption, style, drawable, command){
        var b = new Button(getStyles().tile);
        b.top().left();
        b.clicked(run(function(){
            callHandler("command", {command: command});
        }));
        var body = new Table();
        body.top().left();
        body.add(label(title, style || getStyles().labelGold, 0.92)).left().row();
        body.add(label(caption, getStyles().labelDim, 0.72)).left().padTop(gap.md);
        b.add(body).grow().pad(gap.lg);
        return b;
    }

    function terminalLine(text, style, scale){
        var s = getStyles();
        return label(text, style || s.label, scale == null ? 0.84 : scale, false);
    }

    function aliasCard(name, scope, description, command){
        var s = getStyles();
        var p = panel(s.d.panel, gap.md);
        var top = new Table();
        top.left();
        top.add(label(name, s.labelCyan, 0.92)).left().growX();
        top.add(label(scope, s.labelDim, 0.68)).right();
        p.add(top).growX().row();
        p.add(wrappedLabel(description, s.labelMuted, 0.76)).width(state.compact ? textBlockWidth(420) : 280).left().padTop(gap.md).row();
        p.add(textButton("OPEN_ALIAS", s.action, function(){
            callHandler("command", {command: command});
        })).height(40).minWidth(140).padTop(gap.md).left();
        return p;
    }

    function hotkeyRow(parent, text, key, command){
        var s = getStyles();
        var row = new Table();
        row.background(s.d.panel);
        row.margin(gap.md);
        row.left();
        row.add(label(text, s.label, 0.84)).left().growX();
        row.add(textButton(key, s.action, function(){
            callHandler("command", {command: command, bind: key});
        })).height(46).minWidth(120).right();
        parent.add(row).growX().height(72).padTop(gap.md).row();
    }

    function hotkeyModule(title, code, icon, rows){
        var s = getStyles();
        var p = panel(s.d.panel, gap.lg);
        var head = new Table();
        head.left();
        head.image(icon).size(20).color(theme.gold).padRight(gap.sm);
        head.add(label(title, s.label, 0.96)).left().growX();
        head.add(label(code, s.labelDim, 0.72)).right();
        p.add(head).growX().row();
        for(var i = 0; i < rows.length; i++){
            hotkeyRow(p, rows[i][0], rows[i][1], rows[i][2]);
        }
        return p;
    }

    function buildBuilds(parent){
        var s = getStyles();
        var intro = new Table();
        intro.top().left();

        var left = new Table();
        left.left().top();
        left.add(label("CONSTRUCTION", s.labelCyan, 1.78)).left().row();
        left.add(label("PROTOCOLS", s.labelCyan, 1.78)).left().padTop(gap.xs).row();
        left.add(wrappedLabel("Planetary defense structures are running at 100% efficiency. Manual override active for logistical restructuring and mass structural repair.", s.labelMuted, 0.96)).width(textBlockWidth(760)).left().padTop(gap.lg);

        var right = new Table();
        right.top().right();
        right.add(pill("SYSTEM_OVERRIDE_ENABLED", s.d.panelGold, s.labelGold)).right().colspan(state.compact ? 1 : 2).padBottom(gap.md).row();
        if(state.compact){
            right.add(summaryCard("ACTIVE_STRUCTURES", "14,842", s.labelCyan, s.d.panel)).growX().height(110).row();
            right.add(summaryCard("THREAT_VECTOR", "CRITICAL", s.labelRed, s.d.panelRed)).growX().height(110).padTop(gap.md);
        }else{
            right.add(summaryCard("ACTIVE_STRUCTURES", "14,842", s.labelCyan, s.d.panel)).width(240).height(110).padRight(gap.md);
            right.add(summaryCard("THREAT_VECTOR", "CRITICAL", s.labelRed, s.d.panelRed)).width(220).height(110);
        }

        if(state.compact){
            intro.add(left).growX().row();
            intro.add(right).growX().padTop(gap.lg).row();
        }else{
            intro.add(left).growX().padRight(gap.xl);
            intro.add(right).width(500).top();
        }
        parent.add(intro).growX().row();

        var toggles = new Table();
        toggles.top().left();

        var instant = panel(state.buildInstant ? s.d.panelCyan : s.d.panel, gap.xl);
        var instantHead = new Table();
        instantHead.left();
        var instantText = new Table();
        instantText.left();
        instantText.add(label("INSTANT BUILD", s.label, 1.26)).left().row();
        instantText.add(wrappedLabel("Deploy or deconstruct complex structures instantly.", s.labelMuted, 0.9)).width(state.compact ? textBlockWidth(480) : 340).left().padTop(gap.md);
        instantHead.add(instantText).growX();
        var instantToggle = textButton(state.buildInstant ? "ENABLED" : "DISABLED", state.buildInstant ? s.primary : s.action, function(){
            state.buildInstant = !state.buildInstant;
            callHandler("command", {command: "builds:instant", value: state.buildInstant});
            rebuildContent();
        });
        instantToggle.setChecked(state.buildInstant);
        instantHead.add(instantToggle).height(46).minWidth(150);
        instant.add(instantHead).growX().row();
        instant.add(pill("DESTRUCTIVE OVERRIDE ACTIVE", s.d.panelRed, s.labelRed)).left().padTop(gap.xl);

        var god = panel(state.buildGodmode ? s.d.panelGold : s.d.panel, gap.xl);
        var godHead = new Table();
        godHead.left();
        var godText = new Table();
        godText.left();
        godText.add(label("GODMODE: STRUCTURES", s.label, 1.22)).left().row();
        godText.add(wrappedLabel("Grant near-infinite health to allied buildings.", s.labelMuted, 0.9)).width(state.compact ? textBlockWidth(480) : 340).left().padTop(gap.md);
        godHead.add(godText).growX();
        var godToggle = textButton(state.buildGodmode ? "ONLINE" : "OFFLINE", state.buildGodmode ? s.primary : s.action, function(){
            state.buildGodmode = !state.buildGodmode;
            callHandler("command", {command: "builds:godmode", value: state.buildGodmode});
            rebuildContent();
        });
        godToggle.setChecked(state.buildGodmode);
        godHead.add(godToggle).height(46).minWidth(150);
        god.add(godHead).growX().row();
        god.add(pill("PENDING INITIALIZATION", s.d.actionUp, s.labelDim)).left().padTop(gap.xl);

        if(state.compact){
            toggles.add(instant).growX().row();
            toggles.add(god).growX().padTop(gap.lg);
        }else{
            toggles.add(instant).growX().height(240).padRight(gap.lg);
            toggles.add(god).growX().height(240);
        }
        parent.add(toggles).growX().padTop(gap.xl).row();

        parent.add(label("MASS_ACTIONS_SEQUENCE", s.labelGold, 0.82)).left().padTop(gap.xl).row();
        var mass = new Table();
        mass.left();
        var massCards = [
            buildMassActionCard("HEAL ALL STRUCTURES", "TARGETS: 14.8k", s.labelCyan, s.d.panelCyan, "builds:healAll"),
            buildMassActionCard("ELIMINATE ENEMY BASES", "EXCL. CORES", s.labelGold, s.d.panelGold, "builds:eliminateBases"),
            buildMassActionCard("ANNIHILATE SECTOR", "INCL. CORES", s.labelRed, s.d.panelRed, "builds:annihilateSector"),
            buildMassActionCard("TOTAL MAP WIPE", "LOGISTICS CLEAR", s.label, s.d.panel, "builds:mapWipe")
        ];
        var massCols = state.compact ? 2 : 4;
        for(var mi = 0; mi < massCards.length; mi++){
            mass.add(massCards[mi]).growX().height(158).minWidth(state.compact ? 220 : 0).padRight(gap.lg).padBottom(gap.lg);
            if((mi + 1) % massCols === 0) mass.row();
        }
        parent.add(mass).growX().padTop(gap.md).row();

        var bottom = new Table();
        bottom.top().left();

        var stats = new Table();
        stats.top().left();
        var speed = panel(s.d.panel, gap.lg);
        speed.add(metricLine("BUILD_SPEED_MULT", "x100,000", 0.82, theme.cyan)).growX();
        var integrity = panel(s.d.panel, gap.lg);
        integrity.add(metricLine("GRID_INTEGRITY", "94.2%", 0.942, theme.gold)).growX().row();
        var bars = new Table();
        bars.bottom().left();
        bars.defaults().bottom().padRight(gap.sm);
        var barHeights = [72, 42, 104, 12, 70, 0, 42, 12];
        for(var bi = 0; bi < barHeights.length; bi++){
            var bar = new Table();
            bar.background((bi % 3 === 0) ? s.d.panelCyan : s.d.actionUp);
            bars.add(bar).width(34).height(Math.max(6, barHeights[bi]));
        }
        integrity.add(bars).left().padTop(gap.xl);
        stats.add(speed).growX().height(110).row();
        stats.add(integrity).growX().height(250).padTop(gap.lg);

        var logPanel = panel(s.d.panelDark, gap.lg);
        var logHead = new Table();
        logHead.left();
        logHead.add(label("PROTOCOL_LOG", s.labelGold, 0.82)).left().growX();
        logHead.add(label("V8.0.42-STABLE", s.labelDim, 0.76)).right();
        logPanel.add(logHead).growX().row();
        logPanel.add(terminalLine("[14:22:01]  Initializing V8 engine core...", s.labelDim, 0.82)).left().padTop(gap.md).row();
        logPanel.add(terminalLine("[14:22:04]  SUCCESS: Memory patch applied (0xAF42E)", s.labelCyan, 0.82)).left().padTop(gap.xs).row();
        logPanel.add(terminalLine("[14:22:15]  Scanning for local structural mods...", s.label, 0.82)).left().padTop(gap.xs).row();
        logPanel.add(terminalLine("[14:22:21]  LOADED: Project-Omniscience (v1.2.0)", s.labelGold, 0.82)).left().padTop(gap.xs).row();
        logPanel.add(terminalLine("[14:23:10]  COMMAND EXEC: INSTANT_BUILD = TRUE", s.labelCyan, 0.82)).left().padTop(gap.xs).row();
        logPanel.add(terminalLine("[14:23:45]  ... Waiting for operator input ...", s.labelMuted, 0.82)).left().padTop(gap.xs);

        if(state.compact){
            bottom.add(stats).growX().row();
            bottom.add(logPanel).growX().height(280).padTop(gap.lg);
        }else{
            bottom.add(stats).width(430).padRight(gap.xl).top();
            bottom.add(logPanel).growX().height(378);
        }
        parent.add(bottom).growX().padTop(gap.lg).row();
    }