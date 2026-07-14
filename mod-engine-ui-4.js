function buildWaves(parent){
        var s = getStyles();
        var top = new Table();
        top.top().left();

        var timer = waveTimerPanel();
        var params = panel(s.d.panelGold, gap.xl);
        var header = new Table();
        header.left();
        header.add(label("WAVE SEQUENCER_V2", s.label, 1.18)).left().growX();
        var auto = textButton(state.autoWave ? "AUTO_WAVE: ON" : "AUTO_WAVE: OFF", state.autoWave ? s.primary : s.action, function(){
            state.autoWave = !state.autoWave;
            callHandler("command", {command: "waves:auto", value: state.autoWave});
            rebuildContent();
        });
        auto.setChecked(state.autoWave);
        header.add(auto).height(44).minWidth(170).right();
        params.add(header).growX().row();
        params.add(label("PRIMARY PARAMETERS & THREAT SCALING", s.labelMuted, 0.82)).left().padTop(gap.sm).row();

        var config = new Table();
        config.top().left();
        config.add(waveIndexPanel()).growX().padRight(gap.xl);
        config.add(waveDifficultyPanel()).growX();
        params.add(config).growX().padTop(gap.xl).row();

        if(state.compact){
            top.add(timer).growX().row();
            top.add(params).growX().padTop(gap.lg);
        }else{
            top.add(timer).width(420).height(470).padRight(gap.xl);
            top.add(params).growX().height(350);
        }
        parent.add(top).growX().row();

        var stats = new Table();
        stats.left();
        var enemyCount = enemyUnitCount();
        var spawnRate = waveSpawnRate();
        var bossEstimate = waveBossEstimate();
        if(state.compact){
            stats.add(waveStat("ENEMY_COUNT", String(enemyCount), s.labelGold, theme.gold)).height(116).growX().row();
            stats.add(waveStat("SPAWN_RATE", spawnRate.toFixed(1) + " /S", s.labelCyan, theme.cyan)).height(116).growX().padTop(gap.md).row();
            stats.add(waveStat("BOSS_ESTIMATE", "WAVE " + bossEstimate, s.labelRed, theme.red)).height(116).growX().padTop(gap.md);
        }else{
            stats.add(waveStat("ENEMY_COUNT", String(enemyCount), s.labelGold, theme.gold)).height(116).growX().padRight(gap.lg);
            stats.add(waveStat("SPAWN_RATE", spawnRate.toFixed(1) + " /S", s.labelCyan, theme.cyan)).height(116).growX().padRight(gap.lg);
            stats.add(waveStat("BOSS_ESTIMATE", "WAVE " + bossEstimate, s.labelRed, theme.red)).height(116).growX();
        }
        parent.add(stats).growX().padTop(gap.lg).row();

        var forecastPanel = panel(s.d.panel, gap.lg);
        var WAVES_PER_PAGE = 10;
        var forecastBase = currentWaveIndex();
        var pageStartWave = forecastBase + state.wavePreviewPage * WAVES_PER_PAGE;
        var pageEndWave = pageStartWave + WAVES_PER_PAGE - 1;

        var forecastHeader = new Table();
        forecastHeader.left();
        forecastHeader.add(sectionHeader("WAVE FORECAST", "REAL ENEMY COMPOSITION", getIcon("units", "factory"))).growX();
        forecastPanel.add(forecastHeader).growX().row();

        var pager = new Table();
        pager.left();
        var pagerPrev = textButton("< PREV", state.wavePreviewPage > 0 ? s.action : s.action, function(){
            if(state.wavePreviewPage > 0){ state.wavePreviewPage--; rebuildContent(); }
        });
        pager.add(pagerPrev).height(42).minWidth(100).padRight(gap.md);
        pager.add(label("WAVES " + pageStartWave + " - " + pageEndWave, s.labelCyan, 0.86)).center().growX();
        var pagerNext = textButton("NEXT >", s.action, function(){
            state.wavePreviewPage++;
            rebuildContent();
        });
        pager.add(pagerNext).height(42).minWidth(100).padLeft(gap.md);
        forecastPanel.add(pager).growX().padTop(gap.md).row();

        var forecastList = new Table();
        forecastList.top().left();
        for(var wOffset = 0; wOffset < WAVES_PER_PAGE; wOffset++){
            var waveNum = pageStartWave + wOffset;
            var composition = getWaveComposition(waveNum);
            var waveRow = panel(waveNum === forecastBase ? s.d.panelCyan : s.d.panelDark, gap.md);
            var waveRowHead = new Table();
            waveRowHead.left();
            waveRowHead.add(label("WAVE " + waveNum, waveNum === forecastBase ? s.labelCyan : s.labelGold, 0.84)).left().growX();
            if(waveNum === forecastBase){
                waveRowHead.add(label("CURRENT", s.labelCyan, 0.7)).right();
            }
            waveRow.add(waveRowHead).growX().row();

            if(composition.length === 0){
                waveRow.add(label("NO SPAWN DATA (endless/custom wave rules)", s.labelDim, 0.72)).left().padTop(gap.sm);
            }else{
                var unitIcons = new Table();
                unitIcons.left();
                for(var ci = 0; ci < composition.length; ci++){
                    var comp = composition[ci];
                    var iconCell = new Table();
                    iconCell.left();
                    try{ iconCell.image(regionDrawable(comp.type.uiIcon)).size(30).padRight(gap.xs); }catch(eIcon){}
                    iconCell.add(label("x" + comp.count, s.labelMuted, 0.76)).left();
                    unitIcons.add(iconCell).padRight(gap.lg).padTop(gap.sm);
                }
                waveRow.add(unitIcons).left().padTop(gap.xs);
            }
            forecastList.add(waveRow).growX().padTop(gap.sm).row();
        }
        forecastPanel.add(forecastList).growX().padTop(gap.md);
        parent.add(forecastPanel).growX().padTop(gap.xl).row();
    }

    function buildWorld(parent){
        var s = getStyles();
        var top = new Table();
        top.top().left();

        var env = panel(s.d.panelStrong, gap.xl);
        var envHeader = new Table();
        envHeader.left();
        var envTitle = new Table();
        envTitle.left();
        envTitle.add(label("ENVIRONMENTAL OVERRIDE", s.label, 1.18)).left().row();
        envTitle.add(label("MANUAL OVERRIDE OF PLANETARY PARAMETERS", s.labelMuted, 0.72)).left().padTop(gap.sm);
        envHeader.add(envTitle).growX();
        envHeader.add(textButton("LIVE_LINK: OK", s.action, function(){ callHandler("command", {command: "world:liveLink"}); })).height(42).minWidth(150);
        env.add(envHeader).growX().row();

        var sliders = new Table();
        sliders.top().left();
        var timeSlider = liveSliderBlock("TIME_OF_DAY", 0, 24, 0.1, state.worldTimeOfDay, function(v){
            var h = Math.floor(v);
            var m = Math.floor((v - h) * 60);
            var hh = h < 10 ? "0" + h : "" + h;
            var mm = m < 10 ? "0" + m : "" + m;
            return hh + ":" + mm;
        }, "00:00", "12:00", "24:00", theme.gold, function(v){
            state.worldTimeOfDay = v;
            callHandler("command", {command: "world:timeOfDay", value: v});
        });
        var windSlider = liveSliderBlock("WIND_STRENGTH", 0, 10, 0.1, state.worldWindStrength, function(v){
            return v.toFixed(1) + " m/s";
        }, "CALM", "GALE", "STORM", theme.gold, function(v){
            state.worldWindStrength = v;
            callHandler("command", {command: "world:windStrength", value: v});
        });
        if(state.compact){
            sliders.add(timeSlider).growX().row();
            sliders.add(windSlider).growX().padTop(gap.lg);
        }else{
            sliders.add(timeSlider).growX().padRight(gap.xl);
            sliders.add(windSlider).growX();
        }
        env.add(sliders).growX().padTop(gap.xl).row();

        var envActions = new Table();
        envActions.left();
        envActions.add(textButton("FREEZE_WEATHER", s.action, function(){ callHandler("command", {command: "world:freezeWeather"}); })).height(54).growX().padRight(gap.lg);
        envActions.add(textButton("RANDOMIZE_STORM", s.action, function(){ callHandler("command", {command: "world:randomizeStorm"}); })).height(54).growX();
        env.add(envActions).growX().padTop(gap.xl);

        var speed = panel(s.d.panelCyan, gap.xl);
        speed.add(sectionHeader("SIM_SPEED", null, getIcon("play", "right"))).growX().row();
        speed.add(wrappedLabel("Modify temporal flow. High speeds may cause vertex jitter.", s.labelMuted, 0.86)).width(textBlockWidth(360)).left().padTop(gap.lg).row();
        speed.add(liveSliderBlock("SPEED_MULT", 1, 16, 1, state.simSpeed, function(v){
            return "x" + Math.round(v) + ".0";
        }, "x1", "x8", "x16", theme.gold, function(v){
            state.simSpeed = Math.round(v);
            callHandler("command", {command: "world:simSpeed", speed: state.simSpeed});
        })).growX().padTop(gap.xl).row();
        var speedButtons = new Table();
        speedButtons.left();
        var speedVals = [1, 4, 8, 16];
        for(var si = 0; si < speedVals.length; si++){
            (function(mult){
                var b = textButton("x" + mult, state.simSpeed === mult ? s.primary : s.action, function(){
                    state.simSpeed = mult;
                    callHandler("command", {command: "world:simSpeed", speed: mult});
                    rebuildContent();
                });
                b.setChecked(state.simSpeed === mult);
                speedButtons.add(b).height(42).growX().padRight(gap.sm);
            })(speedVals[si]);
        }
        speed.add(speedButtons).growX().padTop(gap.lg);

        if(state.compact){
            top.add(env).growX().row();
            top.add(speed).growX().padTop(gap.lg);
        }else{
            top.add(env).growX().height(390).padRight(gap.xl);
            top.add(speed).width(420).height(390);
        }
        parent.add(top).growX().row();

        var visuals = panel(s.d.panel, gap.xl);
        visuals.add(label("SYSTEM_VISUALS", s.labelGold, 0.82)).left().row();
        var visualActions = new Table();
        visualActions.left();
        visualActions.add(textButton("FOG_OF_WAR", s.action, function(){ callHandler("command", {command: "world:fogOfWar"}); })).height(58).minWidth(360).padTop(gap.xl).row();
        visualActions.add(textButton("REVEAL_MAP", s.action, function(){ callHandler("command", {command: "world:revealMap"}); })).height(58).minWidth(360).padTop(gap.md);
        visuals.add(visualActions).left();
        if(state.compact){
            parent.add(visuals).growX().height(220).padTop(gap.xl).row();
        }else{
            parent.add(visuals).width(430).height(220).padTop(gap.xl).row();
        }

        var ops = panel(s.d.panel, gap.lg);
        ops.add(sectionHeader("CORE OPERATIONS", "DIRECT_ACTIONS", getIcon("settings"))).growX().row();
        var opsActions = new Table();
        opsActions.left();
        opsActions.add(textButton("CLEAR_MAP", s.action, function(){ callHandler("command", {command: "clearMap"}); })).height(52).minWidth(180).padRight(gap.md);
        opsActions.add(textButton("INSTANT_BUILD", s.action, function(){ callHandler("command", {command: "instantBuild"}); })).height(52).minWidth(200).padRight(gap.md);
        opsActions.add(textButton("OPEN_ITEMS", s.primary, function(){ state.tab = "items"; refreshRoot(); })).height(52).minWidth(180);
        ops.add(opsActions).left().padTop(gap.lg);
        parent.add(ops).growX().padTop(gap.xl).row();
    }

    function buildLinks(parent){
        var s = getStyles();
        var p = panel(s.d.panelCyan, gap.xl);
        p.add(sectionHeader("LINK ROUTER", "NET_SYNC_CHANNELS", getIcon("link", "logic"))).growX().row();
        p.add(wrappedLabel("Coordinate cross-screen handlers and external command bridges. These controls only call listeners and do not mutate gameplay by themselves.", s.labelMuted, 0.88)).width(textBlockWidth(720)).left().padTop(gap.md).row();

        var rows = new Table();
        rows.left();
        addLinkRow(rows, "CORE_BUS", "ONLINE", theme.cyan, "links:coreBus");
        addLinkRow(rows, "SECTOR_RELAY", "STANDBY", theme.gold, "links:sectorRelay");
        addLinkRow(rows, "REMOTE_CONSOLE", "LOCKED", theme.red, "links:remoteConsole");
        p.add(rows).growX().padTop(gap.xl).row();

        var actions = new Table();
        actions.left();
        if(state.compact){
            actions.add(textButton("PING_ALL", s.primary, function(){ callHandler("command", {command: "links:pingAll"}); })).height(54).growX().row();
            actions.add(textButton("REBUILD_LINKS", s.action, function(){ callHandler("command", {command: "links:rebuild"}); })).height(54).growX().padTop(gap.md).row();
            actions.add(textButton("CLEAR_CACHE", s.action, function(){ callHandler("command", {command: "links:clearCache"}); })).height(54).growX().padTop(gap.md);
        }else{
            actions.add(textButton("PING_ALL", s.primary, function(){ callHandler("command", {command: "links:pingAll"}); })).height(54).minWidth(180).padRight(gap.md);
            actions.add(textButton("REBUILD_LINKS", s.action, function(){ callHandler("command", {command: "links:rebuild"}); })).height(54).minWidth(210).padRight(gap.md);
            actions.add(textButton("CLEAR_CACHE", s.action, function(){ callHandler("command", {command: "links:clearCache"}); })).height(54).minWidth(190);
        }
        p.add(actions).left().padTop(gap.xl);
        parent.add(p).growX().row();
    }

    function addLinkRow(table, name, status, color, command){
        var s = getStyles();
        var row = new Table();
        row.background(s.d.panel);
        row.left();
        row.margin(gap.md);
        row.add(label(name, s.labelGold, 0.9)).left().growX();
        row.add(label(status, color === theme.cyan ? s.labelCyan : (color === theme.red ? s.labelRed : s.labelGold), 0.82)).width(120).left();
        row.add(textButton("OPEN", s.action, function(){ callHandler("command", {command: command}); })).height(42).minWidth(110);
        table.add(row).growX().height(72).padBottom(gap.md).row();
    }

    function getItems(){
        var result = [];
        eachSeq(Vars.content.items(), function(item){
            if(visibleContent(item)) result.push(item);
        });
        return result;
    }

    function makeItemButton(item){
        var s = getStyles();
        var b = new Button(s.tile);
        b.top();
        b.setChecked(state.selectedItem === item);
        b.clicked(run(function(){
            state.selectedItem = item;
            rebuildContent();
        }));
        var accent = contentColor(item, theme.cyan);
        var iconBack = new Table();
        iconBack.background(makeDrawable(Color.valueOf("151c25"), Color.valueOf("151c25"), 0, null, false));
        iconBack.image(regionDrawable(item.uiIcon)).size(44).color(accent);
        b.add(iconBack).size(68).padTop(gap.lg).row();
        b.add(label(String(item.localizedName).toUpperCase(), s.labelMuted, 0.72)).center().padTop(gap.md);
        return b;
    }

    function buildAmountControl(){
        var s = getStyles();
        var t = panel(s.d.panelCyan, gap.md);
        if(state.compact){
            var row1 = new Table();
            row1.left();
            row1.add(label("GLOBAL_QUANTITY", s.labelMuted, 0.72)).left().padRight(gap.lg);
            row1.add(textButton("-", s.action, function(){ state.amount = Math.max(1, state.amount - 100); rebuildContent(); })).size(44).padRight(gap.xs);
            var amountField1 = inlineNumberField(state.amount, 1, 999999, s.labelCyan.fontColor, function(num){
                state.amount = num;
            });
            row1.add(amountField1).center().width(120);
            row1.add(textButton("+", s.action, function(){ state.amount = Math.min(999999, state.amount + 100); rebuildContent(); })).size(44).padLeft(gap.xs);
            t.add(row1).left().row();
            var row2 = new Table();
            row2.left();
            row2.add(textButton("INJECT", s.primary, function(){
                if(state.selectedItem != null){
                    callHandler("injectItem", {item: state.selectedItem, amount: state.amount});
                }
            })).growX().height(48);
            t.add(row2).growX().padTop(gap.sm);
        }else{
            t.add(label("GLOBAL_QUANTITY", s.labelMuted, 0.72)).left().padRight(gap.lg);
            t.add(textButton("-", s.action, function(){ state.amount = Math.max(1, state.amount - 100); rebuildContent(); })).size(44).padRight(gap.xs);
            var amountField2 = inlineNumberField(state.amount, 1, 999999, s.labelCyan.fontColor, function(num){
                state.amount = num;
            });
            t.add(amountField2).center().width(120);
            t.add(textButton("+", s.action, function(){ state.amount = Math.min(999999, state.amount + 100); rebuildContent(); })).size(44).padLeft(gap.xs).padRight(gap.lg);
            t.add(label("|", s.labelDim, 1)).padRight(gap.lg);
            t.add(textButton("INJECT", s.primary, function(){
                if(state.selectedItem != null){
                    callHandler("injectItem", {item: state.selectedItem, amount: state.amount});
                }
            })).height(48).minWidth(160);
        }
        return t;
    }

    function buildItems(parent){
        var s = getStyles();
        var head = new Table();
        head.left().top();
        var title = new Table();
        title.left();
        title.add(label("Item Injector", s.label, 1.65)).left().row();
        title.add(wrappedLabel("PROTOCOL: MASS RESOURCE ALLOCATION TO MAIN ENGINE CORE.", s.labelMuted, 0.86)).left().width(textBlockWidth(620)).padTop(gap.sm);
        head.add(title).growX().left();
        if(!state.compact){
            head.add(buildAmountControl()).right().top().padLeft(gap.lg);
        }
        parent.add(head).growX().row();
        if(state.compact){
            parent.add(buildAmountControl()).growX().padTop(gap.lg).row();
        }

        var items = getItems();
        if(state.selectedItem == null && items.length > 0) state.selectedItem = items[0];

        var grid = new Table();
        grid.left().top();
        var cols = state.compact ? 3 : (ArcCore.graphics.getWidth() > 1500 ? 6 : 5);
        for(var i = 0; i < items.length; i++){
            grid.add(makeItemButton(items[i])).minWidth(150).height(138).growX().padRight(gap.md).padBottom(gap.md);
            if((i + 1) % cols === 0) grid.row();
        }
        parent.add(grid).growX().padTop(gap.xl).row();

        var bottom = new Table();
        bottom.top().left();
        var status = panel(s.d.panelGold, gap.lg);
        status.add(label("CORE_STATUS", s.labelGold, 0.82)).left().row();
        var selectedNameLabel = label("NO_ITEM_SELECTED", s.labelMuted, 0.74);
        status.add(selectedNameLabel).left().padTop(gap.md).row();

        var storedRatio = 0;
        var storedLine = new Table();
        storedLine.left();
        var storedTextLine = new Table();
        var storedTitleLabel = label("IN_CORE", s.labelMuted, 0.78);
        var storedValueLabel = label("0", s.labelGold, 0.78);
        storedTextLine.add(storedTitleLabel).left().growX();
        storedTextLine.add(storedValueLabel).right();
        storedLine.add(storedTextLine).growX().row();
        var storedBar = new Table();
        storedBar.background(dynamicProgressDrawable(function(){ return storedRatio; }, function(){ return theme.gold; }));
        storedLine.add(storedBar).growX().height(7).padTop(gap.sm);
        status.add(storedLine).growX().padTop(gap.lg).row();

        var flowRatio = 0;
        var flowIsNegative = false;
        var flowLine = new Table();
        flowLine.left();
        var flowTextLine = new Table();
        var flowTitleLabel = label("NET_FLOW", s.labelMuted, 0.78);
        var flowValueLabel = label("+0 / SEC", s.labelCyan, 0.78);
        flowTextLine.add(flowTitleLabel).left().growX();
        flowTextLine.add(flowValueLabel).right();
        flowLine.add(flowTextLine).growX().row();
        var flowBar = new Table();
        flowBar.background(dynamicProgressDrawable(function(){ return flowRatio; }, function(){ return flowIsNegative ? theme.red : theme.cyan; }));
        flowLine.add(flowBar).growX().height(7).padTop(gap.sm);
        status.add(flowLine).growX().padTop(gap.lg);