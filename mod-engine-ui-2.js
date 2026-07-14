function topbarBrand(){
        if(state.tab === "home") return "MINDUSTRY V8";
        return "NEXUS_OS";
    }

    function topbarRoute(){
        if(state.tab === "waves") return "WAVE_CONTROLLER::DEPLOY_SEQUENCER";
        if(state.tab === "world") return "SECTOR_WORLD_SIM_04";
        if(state.tab === "items") return "//CORE_INTERFACE/ITEMS";
        if(state.tab === "units") return "//CORE_INTERFACE/UNITS";
        if(state.tab === "player") return "PILOT_CORE::STATUS_OVERRIDE";
        if(state.tab === "weapon") return "OFFENSIVE_MATRIX::BALLISTIC_TUNING";
        if(state.tab === "mining") return "EXTRACTION_PROTOCOL::RESOURCE_HARVEST";
        if(state.tab === "inspector") return "//CORE_INTERFACE/INSPECTOR";
        if(state.tab === "builds") return "STRUCTURE_PROTOCOL::OVERRIDE_LAYER";
        if(state.tab === "console") return "TACTICAL_COMMAND_TERMINAL";
        if(state.tab === "hotkeys") return "HOTKEY_CONFIGURATION_KERNEL";
        if(state.tab === "links") return "NET_LINK_ROUTER";
        return "//CORE_INTERFACE/" + state.tab.toUpperCase();
    }

    function addTopBar(parent){
        var s = getStyles();
        var top = new Table();
        top.background(s.d.topbar);
        top.margin(gap.md);
        top.left();

        var brand = new Table();
        brand.left();
        if(state.compact){
            brand.add(label(topbarBrand(), s.labelGold, 1.18)).left().row();
            brand.add(label(topbarRoute(), s.labelCyan, 0.8)).left().padTop(gap.xs);
        }else{
            brand.add(label(topbarBrand(), s.labelGold, 1.35)).left().padRight(gap.lg);
            brand.add(label("|", s.labelDim, 1.1)).padRight(gap.lg);
            brand.add(label(topbarRoute(), s.labelCyan, 0.9)).left();
        }

        top.add(brand).growX().left();

        if(!state.compact){
            var metrics = new Table();
            metrics.left();
            metrics.background(s.d.search);
            metrics.margin(gap.sm);
            metrics.add(label("QUERY DATABASE...", s.labelDim, 0.82)).width(260).left();
            metrics.image(getIcon("zoom", "search")).size(22).color(theme.muted).padLeft(gap.sm);
            top.add(metrics).padRight(gap.md);
        }

        var actions = new Table();
        actions.right();
        actions.add(iconButton(getIcon("settings"), function(){ callHandler("command", {command: "settings"}); })).size(48).padRight(gap.sm);
        actions.add(iconButton(getIcon("info"), function(){ callHandler("openDocs", {}); })).size(48).padRight(gap.sm);
        actions.add(iconButton(getIcon("cancel", "close"), function(){ hide(); })).size(48);
        top.add(actions).right();

        parent.add(top).growX().minHeight(state.compact ? 86 : 72).row();
    }

    function addFooter(parent){
        var s = getStyles();
        var footer = new Table();
        footer.background(s.d.panelDark);
        footer.margin(gap.sm);
        footer.left();
        if(state.compact){
            footer.add(label("BUILD_ENGINE V8.0.42", s.labelCyan, 0.78)).left().growX().row();
            var links = new Table();
            links.left();
            links.add(textButton("Docs", s.action, function(){ callHandler("openDocs", {}); })).height(34).padRight(gap.sm);
            links.add(textButton("Support", s.action, function(){ callHandler("support", {}); })).height(34).padRight(gap.sm);
            links.add(textButton("Language", s.action, function(){ callHandler("language", {language: "toggle"}); })).height(34);
            footer.add(links).left().padTop(gap.xs).row();
            footer.add(label("SYSTEM_LINK ACTIVE", s.labelCyan, 0.78)).left().padTop(gap.xs);
            parent.add(footer).growX().minHeight(84);
        }else{
            footer.add(label("BUILD_ENGINE V8.0.42", s.labelCyan, 0.82)).padRight(gap.lg);
            footer.add(label("|", s.labelDim, 0.82)).padRight(gap.lg);
            footer.add(textButton("Docs", s.action, function(){ callHandler("openDocs", {}); })).height(34).padRight(gap.sm);
            footer.add(textButton("Support", s.action, function(){ callHandler("support", {}); })).height(34).padRight(gap.sm);
            footer.add(textButton("Language", s.action, function(){ callHandler("language", {language: "toggle"}); })).height(34);
            footer.add().growX();
            footer.add(label("SYSTEM_LINK ACTIVE", s.labelCyan, 0.82)).right();
            parent.add(footer).growX().height(48);
        }
    }

    function navEntries(){
        var all = [
            {id: "home", text: "Home", icon: getIcon("home"), mode: "usual"},
            {id: "waves", text: "Waves", icon: getIcon("waves", "water"), mode: "usual"},
            {id: "world", text: "World", icon: getIcon("planet", "map"), mode: "usual"},
            {id: "items", text: "Items", icon: getIcon("box", "database"), mode: "usual"},
            {id: "units", text: "Units", icon: getIcon("units", "factory"), mode: "sandbox"},
            {id: "player", text: "Player", icon: getIcon("players", "admin"), mode: "sandbox"},
            {id: "weapon", text: "Weapon", icon: getIcon("commandAttack", "target"), mode: "sandbox"},
            {id: "mining", text: "Mining", icon: getIcon("pick", "hammer"), mode: "usual"},
            {id: "inspector", text: "Inspector", icon: getIcon("zoom", "search"), mode: "usual"},
            {id: "builds", text: "Builds", icon: getIcon("edit", "wrench"), mode: "sandbox"},
            {id: "radius", text: "Radius", icon: getIcon("logic", "settings"), mode: "usual"},
            {id: "hotkeys", text: "Hotkeys", icon: getIcon("settings"), mode: "sandbox"},
            {id: "console", text: "Console", icon: getIcon("terminal", "file"), mode: "usual"}
        ];
        var mode = state.navMode || "all";
        if(mode === "all") return all;
        var filtered = [];
        for(var i = 0; i < all.length; i++){
            if(all[i].mode === mode) filtered.push(all[i]);
        }
        return filtered;
    }

    function safeIcon(icon){
        return icon == null ? getIcon("settings") : icon;
    }

    function makeNavButton(entry, horizontal){
        var s = getStyles();
        var b = new Button(s.nav);
        b.left();
        b.setChecked(state.tab === entry.id);
        b.clicked(run(function(){
            if(state.tab !== entry.id){
                state.tab = entry.id;
                callHandler("nav", {tab: entry.id});
                refreshRoot();
            }
        }));

        if(horizontal){
            b.image(safeIcon(entry.icon)).size(26).color(state.tab === entry.id ? theme.gold : theme.muted).padRight(gap.sm);
            b.add(label(entry.text, state.tab === entry.id ? s.labelGold : s.labelMuted, 0.78)).left();
        }else{
            b.image(safeIcon(entry.icon)).size(28).color(state.tab === entry.id ? theme.gold : theme.muted).padLeft(gap.md).padRight(gap.lg);
            b.add(label(entry.text, state.tab === entry.id ? s.labelGold : s.labelMuted, 0.92)).left().growX();
        }
        return b;
    }

    function switchNavMode(mode){
        state.navMode = mode;
        var entries = navEntries();
        var stillValid = false;
        for(var i = 0; i < entries.length; i++){
            if(entries[i].id === state.tab){ stillValid = true; break; }
        }
        if(!stillValid && entries.length > 0){
            state.tab = entries[0].id;
        }
        refreshRoot();
    }

    function buildModeSwitcher(horizontal){
        var s = getStyles();
        var modes = [
            {text: "ALL", value: "all", icon: getIcon("list", "menu"), caption: "EVERYTHING", activeStyle: s.action, activeColor: theme.cyan},
            {text: "SANDBOX", value: "sandbox", icon: getIcon("warning", "info"), caption: "CHEATS & TOOLS", activeStyle: s.danger, activeColor: theme.red},
            {text: "USUAL", value: "usual", icon: getIcon("play", "ok"), caption: "NORMAL PLAY", activeStyle: s.primary, activeColor: theme.gold}
        ];
        var row = new Table();
        row.left();
        for(var i = 0; i < modes.length; i++){
            (function(m){
                var active = (state.navMode || "all") === m.value;
                var btn = new Button(s.tile);
                btn.setChecked(active);
                btn.clicked(run(function(){
                    switchNavMode(m.value);
                }));
                var inner = new Table();
                inner.center();
                try{ inner.image(safeIcon(m.icon)).size(horizontal ? 20 : 22).color(active ? m.activeColor : theme.muted).padBottom(gap.xs).row(); }catch(eIcon){}
                inner.add(label(m.text, active ? s.labelGold : s.labelMuted, horizontal ? 0.74 : 0.82)).center().row();
                if(!horizontal){
                    inner.add(label(m.caption, s.labelDim, 0.6)).center().padTop(2);
                }
                btn.add(inner).grow().pad(gap.xs);
                if(horizontal){
                    row.add(btn).height(56).minWidth(84).padRight(gap.xs);
                }else{
                    row.add(btn).growX().height(64).padBottom(gap.xs).row();
                }
            })(modes[i]);
        }
        return row;
    }

    function addSidebar(parent){
        var s = getStyles();
        sidebarHost = new Table();
        sidebarHost.background(s.d.sidebar);
        sidebarHost.top().left();
        sidebarHost.margin(gap.lg);

        sidebarHost.add(buildModeSwitcher(false)).growX().padBottom(gap.sm).row();

        sidebarHost.add(label("SUBSYSTEMS", s.labelDim, 0.72)).left().padTop(gap.lg).padBottom(gap.md).row();

        var navScroll = new ScrollPane(new Table(), s.pane);
        navScrollPane = navScroll;
        sidebarHost.add(navScroll).grow().row();

        var navTable = navScroll.getWidget();
        navTable.top().left();
        navHost = navTable;
        buildNavInto(navTable, false);

        var operator = new Table();
        operator.left();
        operator.background(s.d.panel);
        operator.margin(gap.sm);
        operator.image(getIcon("admin", "settings")).size(34).color(theme.gold).padRight(gap.md);
        var opText = new Table();
        opText.left();
        opText.add(label("ADMIN_CORE", s.labelGold, 0.82)).left().row();
        opText.add(label("CONNECTED: P-102", s.labelMuted, 0.72)).left();
        operator.add(opText).growX();
        sidebarHost.add(operator).growX().height(64).padTop(gap.lg).row();

        sidebarHost.add(textButton("INITIALIZE", s.primary, function(){ callHandler("initialize", {}); })).growX().height(58).padTop(gap.lg);

        parent.add(sidebarHost).width(Math.min(310, ArcCore.graphics.getWidth() * 0.26)).growY();
    }

    function addCompactNav(parent){
        var s = getStyles();
        var wrapper = new Table();
        wrapper.background(s.d.sidebar);
        wrapper.margin(gap.sm);
        var outerRow = new Table();
        outerRow.left();
        outerRow.add(buildModeSwitcher(true)).padRight(gap.md);
        var navTable = new Table();
        navTable.left();
        navHost = navTable;
        buildNavInto(navTable, true);
        outerRow.add(navTable);
        var pane = new ScrollPane(outerRow, s.pane);
        navScrollPane = pane;
        wrapper.add(pane).grow();
        parent.add(wrapper).growX().height(76).row();
        sidebarHost = navTable;
    }

    function buildNavInto(table, horizontal){
        table.clearChildren();
        var entries = navEntries();
        for(var i = 0; i < entries.length; i++){
            if(horizontal){
                table.add(makeNavButton(entries[i], true)).height(52).minWidth(132).padRight(gap.sm);
            }else{
                table.add(makeNavButton(entries[i], false)).growX().height(56).padBottom(gap.sm).row();
            }
        }
    }

    function rebuildNavigation(){
        if(navHost == null) return;
        buildNavInto(navHost, state.compact);
    }

    function rebuildContent(){
        if(contentHost == null) return;
        contentHost.clearChildren();
        contentHost.top().left();

        if(state.tab === "home") buildHome(contentHost);
        else if(state.tab === "waves") buildWaves(contentHost);
        else if(state.tab === "world") buildWorld(contentHost);
        else if(state.tab === "items") buildItems(contentHost);
        else if(state.tab === "units") buildUnits(contentHost);
        else if(state.tab === "player") buildPlayer(contentHost);
        else if(state.tab === "weapon") buildWeapon(contentHost);
        else if(state.tab === "mining") buildMining(contentHost);
        else if(state.tab === "inspector") buildInspector(contentHost);
        else if(state.tab === "builds") buildBuilds(contentHost);
        else if(state.tab === "console") buildConsole(contentHost);
        else if(state.tab === "hotkeys") buildHotkeys(contentHost);
        else if(state.tab === "links") buildLinks(contentHost);
        else if(state.tab === "radius") buildRadius(contentHost);
        else buildUtility(contentHost, state.tab);
    }

    function statusPair(title, value, valueStyle){
        var s = getStyles();
        var t = new Table();
        t.background(s.d.panel);
        t.margin(gap.md);
        t.left();
        t.add(label(title, s.labelMuted, 0.72)).left().row();
        t.add(wrappedLabel(value, valueStyle || s.labelCyan, 1.25)).left().growX().padTop(gap.xs);
        return t;
    }

    function buildCoreVisual(){
        var s = getStyles();
        var stack = new Stack();
        var back = new Table();
        back.background(makeDrawable(theme.black, theme.lineSoft, 1, theme.cyan, true));
        var grid = new Table();
        grid.center();
        grid.add(label("CORE", s.labelCyan, 1.05)).center().row();
        grid.add(label("MATRIX", s.labelGold, 0.8)).center().padTop(gap.xs).row();
        grid.add(label("ONLINE", s.labelMuted, 0.72)).center().padTop(gap.sm);
        stack.add(back);
        stack.add(grid);
        return stack;
    }

    function buildHome(parent){
        var s = getStyles();
        var hero = panel(s.d.panelStrong, gap.xl);

        var left = new Table();
        left.left().top();
        left.add(label("MOD ENGINE", s.labelGold, 1.75)).left().row();
        left.add(label("ENGINE OPERATIONAL", s.label, 1.42)).left().padTop(gap.sm).row();
        left.add(wrappedLabel("Core interface initialized. Planetary defense protocols and mod injection systems are running at nominal capacity.", s.labelMuted, 0.92)).width(textBlockWidth(760)).left().padTop(gap.md).row();

        var status = new Table();
        status.left();
        var threat = threatLevelInfo();
        status.add(statusPair("SECTOR", currentSectorLabel(), s.labelCyan)).width(state.compact ? textBlockWidth(320) : 320).height(96).padRight(gap.md);
        status.add(statusPair("THREAT_LEVEL", threat.text, threat.style)).growX().minWidth(200).height(96);
        left.add(status).growX().left().padTop(gap.lg);

        hero.add(left).growX().left().top();
        if(!state.compact){
            hero.add(buildCoreVisual()).size(230).padLeft(gap.xl);
        }
        parent.add(hero).growX().minHeight(260).row();

        var body = new Table();
        body.top().left();
        var flowPanel = panel(s.d.panel, gap.lg);
        flowPanel.add(sectionHeader("CORE ITEM FLOW", "LIVE PER-SECOND DELTA", getIcon("box", "database"))).growX().row();
        flowPanel.add(wrappedLabel("Real core storage levels and net change per second (production minus consumption).", s.labelMuted, 0.82)).growX().left().padTop(gap.sm).row();

        var flowList = new Table();
        flowList.top().left();
        var flowPane = new ScrollPane(flowList, s.pane);
        flowPane.setScrollingDisabled(true, false);
        try{
            flowPane.setFadeScrollBars(false);
            flowPane.setOverscroll(false, false);
        }catch(ePane){}
        flowPanel.add(flowPane).growX().height(state.compact ? 260 : 320).padTop(gap.lg);

        var flowItems = getItems();
        var flowRowRefs = [];
        var flowEmptyLabel = label("NO ITEMS IN CORE STORAGE", s.labelDim, 0.8);
        for(var fi = 0; fi < flowItems.length; fi++){
            var flowItem = flowItems[fi];
            var frow = new Table();
            frow.left();
            try{ frow.image(regionDrawable(flowItem.uiIcon)).size(28).color(contentColor(flowItem, theme.cyan)).padRight(gap.sm); }catch(eIcon){}
            frow.add(label(String(flowItem.localizedName).toUpperCase(), s.labelMuted, 0.76)).left().growX();
            var amountLabel = label("0", s.label, 0.8);
            frow.add(amountLabel).padRight(gap.sm);
            var rateLabel = label("(+0/s)", s.labelDim, 0.76);
            frow.add(rateLabel).right();
            flowList.add(frow).growX().padTop(gap.xs).row();
            flowRowRefs.push({item: flowItem, key: String(flowItem.name), row: frow, amountLabel: amountLabel, rateLabel: rateLabel, lastAmountText: null, lastRateText: null});
        }
        flowList.add(flowEmptyLabel).left();

        function refreshFlowList(){
            var flow = getCoreItemFlow();
            var shown = 0;
            var visibilityChanged = false;
            for(var ri = 0; ri < flowRowRefs.length; ri++){
                var ref = flowRowRefs[ri];
                var amount = flow.totals[ref.key] || 0;
                var rate = Math.round(flow.rates[ref.key] || 0);
                var visible = amount > 0 || rate !== 0;
                if(ref.row.visible !== visible){
                    ref.row.visible = visible;
                    visibilityChanged = true;
                }
                if(visible){
                    shown++;
                    var amountText = String(Math.round(amount));
                    if(amountText !== ref.lastAmountText){
                        ref.lastAmountText = amountText;
                        ref.amountLabel.setText(amountText);
                    }
                    var rateText = "(" + (rate > 0 ? "+" : "") + rate + "/s)";
                    if(rateText !== ref.lastRateText){
                        ref.lastRateText = rateText;
                        ref.rateLabel.setText(rateText);
                        ref.rateLabel.setStyle(rate > 0 ? s.labelCyan : (rate < 0 ? s.labelRed : s.labelDim));
                    }
                }
            }
            var emptyVisible = shown === 0;
            if(flowEmptyLabel.visible !== emptyVisible){
                flowEmptyLabel.visible = emptyVisible;
                visibilityChanged = true;
            }
            if(visibilityChanged){
                try{ flowList.invalidateHierarchy(); }catch(eInv){}
            }
        }
        refreshFlowList();
        flowPanel.update(run(function(){
            refreshFlowList();
        }));

        var settings = panel(s.d.panelGold, gap.lg);
        settings.add(sectionHeader("POWER GRID", null, getIcon("bolt", "flash"))).growX().row();
        var powerInfo = netPowerBalance();
        var powerRow = new Table();
        powerRow.left();
        var powerValueLabel = label("+0", powerInfo.value >= 0 ? s.labelCyan : s.labelRed, 1.6);
        powerRow.add(powerValueLabel).left().growX();
        powerRow.add(label("UNITS/SEC", s.labelMuted, 0.72)).right();
        settings.add(powerRow).growX().padTop(gap.md).row();
        var powerStatusLabel = label(powerInfo.hasNetwork ? "GRID ONLINE" : "NO POWER NETWORK DETECTED", powerInfo.hasNetwork ? s.labelMuted : s.labelDim, 0.72);
        settings.add(powerStatusLabel).left().padTop(gap.xs).row();
        settings.add(textButton("GLOBAL_PREFERENCES", s.action, function(){ callHandler("command", {command: "preferences"}); })).growX().height(54).padTop(gap.lg);

        function refreshPowerRow(info){
            var rounded = Math.round(info.value);
            var text = (rounded >= 0 ? "+" : "") + rounded;
            if(text !== lastPowerText){
                lastPowerText = text;
                powerValueLabel.setText(text);
                powerValueLabel.setStyle(info.value >= 0 ? s.labelCyan : s.labelRed);
            }
            if(info.hasNetwork !== lastPowerOnline){
                lastPowerOnline = info.hasNetwork;
                powerStatusLabel.setText(info.hasNetwork ? "GRID ONLINE" : "NO POWER NETWORK DETECTED");
            }
        }
        var lastPowerText = null;
        var lastPowerOnline = null;
        var powerRefreshTimer = 0;
        settings.update(run(function(){
            powerRefreshTimer++;
            if(powerRefreshTimer < 18) return; // ~0.3s at 60fps - scanning all buildings isn't needed every frame
            powerRefreshTimer = 0;
            refreshPowerRow(netPowerBalance());
        }));

        if(state.compact){
            body.add(flowPanel).growX().row();
            body.add(settings).growX().padTop(gap.lg);
        }else{
            body.add(flowPanel).growX().padRight(gap.lg);
            body.add(settings).width(420).top();
        }
        parent.add(body).growX().padTop(gap.lg).row();
    }

    function metricLine(name, value, percent, color){
        var s = getStyles();
        var t = new Table();
        t.left();
        var line = new Table();
        line.add(label(name, s.labelMuted, 0.78)).left().growX();
        line.add(label(value, color === theme.cyan ? s.labelCyan : s.labelGold, 0.78)).right();
        t.add(line).growX().row();
        var bar = new Table();
        bar.background(progressDrawable(percent, color));
        t.add(bar).growX().height(7).padTop(gap.sm);
        return t;
    }

    function sliderBlock(name, value, leftMark, midMark, rightMark, percent, color){
        var s = getStyles();
        var t = new Table();
        t.left();
        var line = new Table();
        line.left();
        line.add(label(name, s.labelMuted, 0.82)).left().growX();
        line.add(label(value, color === theme.cyan ? s.labelCyan : s.labelGold, 1)).right();
        t.add(line).growX().row();

        var bar = new Table();
        bar.background(sliderDrawable(percent, color));
        t.add(bar).growX().height(34).padTop(gap.md).row();

        var marks = new Table();
        marks.add(label(leftMark, s.labelDim, 0.66)).left().growX();
        marks.add(label(midMark, s.labelDim, 0.66)).center().growX();
        marks.add(label(rightMark, s.labelDim, 0.66)).right().growX();
        t.add(marks).growX().padTop(gap.xs);
        return t;
    }

    function liveSliderBlock(name, min, max, step, current, formatter, leftMark, midMark, rightMark, color, onChange){
        var s = getStyles();
        var t = new Table();
        t.left();

        var line = new Table();
        line.left();
        line.add(label(name, s.labelMuted, 0.82)).left().growX();
        var valueLabel = label(formatter(current), color === theme.cyan ? s.labelCyan : s.labelGold, 1);
        line.add(valueLabel).right();
        t.add(line).growX().row();

        var slider = new Slider(min, max, step, false, Styles.defaultSlider);
        slider.setValue(current);
        slider.changed(run(function(){
            var val = slider.getValue();
            valueLabel.setText(formatter(val));
            if(onChange != null) onChange(val);
        }));
        t.add(slider).growX().height(34).padTop(gap.md).row();

        var marks = new Table();
        marks.add(label(leftMark, s.labelDim, 0.66)).left().growX();
        marks.add(label(midMark, s.labelDim, 0.66)).center().growX();
        marks.add(label(rightMark, s.labelDim, 0.66)).right().growX();
        t.add(marks).growX().padTop(gap.xs);
        return t;
    }