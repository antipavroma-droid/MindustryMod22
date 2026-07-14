function buildConsole(parent){
        var s = getStyles();
        var split = new Table();
        split.top().left();

        var terminal = panel(s.d.panelDark, gap.xl);
        var terminalHead = new Table();
        terminalHead.left();
        var termTitle = new Table();
        termTitle.left();
        termTitle.add(label("TACTICAL COMMAND", s.label, 1.48)).left().row();
        termTitle.add(label("TERMINAL", s.label, 1.48)).left().padTop(gap.xs);
        terminalHead.add(termTitle).growX();
        if(state.compact){
            terminal.add(terminalHead).growX().row();
            var termActions = new Table();
            termActions.left();
            termActions.add(pill("CONNECTED // V8_PROTOCOL", s.d.panelCyan, s.labelCyan)).left().row();
            var termButtons = new Table();
            termButtons.left();
            termButtons.add(textButton("CLEAR_LOG", s.action, function(){ callHandler("command", {command: "console:clearLog"}); })).height(42).minWidth(140).padRight(gap.sm);
            termButtons.add(textButton("EXPORT_TRACE", s.action, function(){ callHandler("command", {command: "console:exportTrace"}); })).height(42).minWidth(160);
            termActions.add(termButtons).left().padTop(gap.sm);
            terminal.add(termActions).left().padTop(gap.md).row();
        }else{
            terminalHead.add(pill("CONNECTED // V8_PROTOCOL", s.d.panelCyan, s.labelCyan)).padRight(gap.md);
            terminalHead.add(textButton("CLEAR_LOG", s.action, function(){ callHandler("command", {command: "console:clearLog"}); })).height(42).minWidth(140).padRight(gap.sm);
            terminalHead.add(textButton("EXPORT_TRACE", s.action, function(){ callHandler("command", {command: "console:exportTrace"}); })).height(42).minWidth(160);
            terminal.add(terminalHead).growX().row();
        }

        var logArea = panel(s.d.screen, gap.lg);
        var logContent = new Table();
        logContent.top().left();
        var lines = state.consoleLines == null ? [] : state.consoleLines;
        if(lines.length === 0){
            logContent.add(terminalLine("<- console buffer empty", s.labelDim, 0.82)).left();
        }else{
            for(var li = 0; li < lines.length; li++){
                var lineText = String(lines[li]);
                var lineStyle = s.labelDim;
                if(lineText.indexOf("ERR") >= 0 || lineText.indexOf("Exception") >= 0) lineStyle = s.labelRed;
                else if(lineText.indexOf("<-") === 0 || lineText.indexOf("RESULT") >= 0) lineStyle = s.labelCyan;
                else if(lineText.indexOf(")") === 0) lineStyle = s.label;
                else if(lineText.indexOf("WARN") >= 0) lineStyle = s.labelGold;
                logContent.add(terminalLine(lineText, lineStyle, 0.82)).left().padTop(li === 0 ? 0 : gap.xs).row();
            }
        }
        var logPane = new ScrollPane(logContent, getStyles().pane);
        logPane.setScrollingDisabled(true, false);
        try{
            logPane.setFadeScrollBars(false);
            logPane.setOverscroll(false, false);
        }catch(e){}
        logArea.add(logPane).grow();
        terminal.add(logArea).growX().height(state.compact ? 460 : 760).padTop(gap.lg).row();

        var prompt = new Table();
        prompt.left();
        var promptFieldStyle = new TextField.TextFieldStyle(Styles.defaultField);
        promptFieldStyle.font = Fonts.def;
        promptFieldStyle.fontColor = s.labelDim.fontColor;
        var promptField = new TextField(state.consoleInputText || "", promptFieldStyle);
        promptField.setMessageText("> ENTER_COMMAND_OR_JS_EXPRESSION");
        // Deliberately NOT calling setMaxLength() - libGDX TextField defaults to unlimited
        // input length. The previous implementation used Vars.ui.showTextInput(), the
        // engine's own system dialog, which has an internal field we don't control and
        // can't verify the limit of. This embedded field removes that dependency entirely.
        promptField.changed(run(function(){
            state.consoleInputText = String(promptField.getText());
        }));
        var runConsoleCommand = function(){
            var text = state.consoleInputText;
            if(text == null || text.length === 0) return;
            callHandler("command", {command: "console:runProtocol", text: text});
            state.consoleInputText = "";
            promptField.setText("");
        };
        try{
            promptField.setTextFieldListener(new JavaAdapter(Packages.arc.scene.ui.TextField.TextFieldListener, {
                keyTyped: function(field, c){
                    if(c === '\n' || c === '\r'){
                        runConsoleCommand();
                    }
                }
            }));
        }catch(eListener){}
        if(state.compact){
            prompt.add(promptField).growX().height(48).row();
            prompt.add(textButton("RUN_PROTOCOL", s.primary, runConsoleCommand)).height(48).minWidth(180).padTop(gap.md).left();
        }else{
            prompt.add(promptField).growX().height(48).padRight(gap.md);
            prompt.add(textButton("RUN_PROTOCOL", s.primary, runConsoleCommand)).height(48).minWidth(180);
        }
        terminal.add(prompt).growX().padTop(gap.lg);

        var sidebar = new Table();
        sidebar.top().left();
        sidebar.add(aliasCard("player", "OBJECT", "Access local pilot parameters: health, position, inventory, gear.", "console:alias:player")).growX().row();
        sidebar.add(aliasCard("state", "GLOBAL", "Application runtime variables and session storage access.", "console:alias:state")).growX().padTop(gap.md).row();
        sidebar.add(aliasCard("world", "SCENE", "Environmental controls, weather, and topography systems.", "console:alias:world")).growX().padTop(gap.md).row();
        sidebar.add(aliasCard("logic", "COMPUTE", "Tactical calculation engine and probability matrix tools.", "console:alias:logic")).growX().padTop(gap.md).row();
        sidebar.add(aliasCard("items", "REGISTRY", "Material database and global resource allocation map.", "console:alias:items")).growX().padTop(gap.md).row();

        if(state.compact){
            split.add(terminal).growX().row();
            split.add(sidebar).growX().padTop(gap.lg).row();
        }else{
            split.add(terminal).growX().padRight(gap.xl);
            split.add(sidebar).width(380).top();
        }
        parent.add(split).growX().row();
    }

    function buildHotkeys(parent){
        var s = getStyles();
        var head = panel(s.d.panelStrong, gap.xl);
        head.add(label("HOTKEY CONFIGURATION", s.label, 1.18)).left().row();
        head.add(wrappedLabel("Click a key cell and press a button to remap. ESC to cancel or unbind. Systems will recalibrate immediately upon entry.", s.labelMuted, 0.9)).width(textBlockWidth(820)).left().padTop(gap.lg);
        parent.add(head).growX().row();

        var modules = [
            hotkeyModule("INTERFACE", "MODULE_01", getIcon("box", "database"), [["Toggle Menu", "TAB", "hotkeys:toggleMenu"], ["Telemetry HUD", "H", "hotkeys:telemetryHud"], ["Overlay Opacity", "0", "hotkeys:overlayOpacity"]]),
            hotkeyModule("CONSTRUCTION", "MODULE_02", getIcon("edit", "wrench"), [["Instant Build", "F4", "hotkeys:instantBuild"], ["Structure Godmode", "F5", "hotkeys:structureGodmode"], ["Deconstruct Layer", "DEL", "hotkeys:deconstructLayer"]]),
            hotkeyModule("WAVES", "MODULE_03", getIcon("waves", "water"), [["Force Wave", "F8", "hotkeys:forceWave"], ["Pause Wave Timer", "P", "hotkeys:pauseWaveTimer"]]),
            hotkeyModule("MASS ACTIONS", "MODULE_04", getIcon("commandAttack", "target"), [["Heal All Structures", "H", "hotkeys:healAllStructures"], ["Re-Arm Defensive Grid", "R", "hotkeys:rearmGrid"], ["Wipe Debris", "NONE", "hotkeys:wipeDebris"]])
        ];

        var grid = new Table();
        grid.top().left();
        var cols = state.compact ? 1 : 2;
        for(var i = 0; i < modules.length; i++){
            grid.add(modules[i]).growX().height(i === 2 ? 260 : 320).padRight(gap.lg).padBottom(gap.lg);
            if((i + 1) % cols === 0) grid.row();
        }
        parent.add(grid).growX().padTop(gap.xl).row();

        var footer = new Table();
        footer.background(s.d.panelDark);
        footer.margin(gap.md);
        footer.left();
        if(state.compact){
            footer.add(label("V8.4.12 // PROTOCOL-LINK-ESTABLISHED", s.labelCyan, 0.84)).left().growX().row();
            footer.add(textButton("RESET_ALL_BINDS", s.danger, function(){ callHandler("command", {command: "hotkeys:resetAll"}); })).height(54).growX().padTop(gap.md).row();
            footer.add(textButton("SAVE & EXIT", s.primary, function(){ callHandler("command", {command: "hotkeys:saveExit"}); })).height(54).growX().padTop(gap.md);
            parent.add(footer).growX().padTop(gap.md).row();
        }else{
            footer.add(label("V8.4.12 // PROTOCOL-LINK-ESTABLISHED", s.labelCyan, 0.84)).left().growX();
            footer.add(textButton("RESET_ALL_BINDS", s.danger, function(){ callHandler("command", {command: "hotkeys:resetAll"}); })).height(54).minWidth(220).padRight(gap.md);
            footer.add(textButton("SAVE & EXIT", s.primary, function(){ callHandler("command", {command: "hotkeys:saveExit"}); })).height(54).minWidth(180);
            parent.add(footer).growX().height(74).padTop(gap.md).row();
        }
    }

    function statusOverrideButton(text, drawable, labelStyle, command){
        var b = new Button(getStyles().tile);
        var body = new Table();
        body.margin(gap.md);
        body.left();
        body.add(label(text, labelStyle || getStyles().label, 0.84)).left().growX();
        body.add(label("●", labelStyle || getStyles().labelGold, 0.9)).right();
        b.add(body).grow();
        b.clicked(run(function(){
            callHandler("command", {command: command});
        }));
        return b;
    }

    function fleetMinerCard(entry, resourceOptions){
        var s = getStyles();
        var typeName = String(entry.type.name);
        var p = panel(s.d.panel, gap.md);
        var head = new Table();
        head.left();
        try{
            head.image(regionDrawable(entry.type.uiIcon)).size(40).padRight(gap.md);
        }catch(eIcon){}
        var headText = new Table();
        headText.left();
        headText.add(label(String(entry.type.localizedName).toUpperCase(), s.labelGold, 0.86)).left().row();
        headText.add(label(entry.count + " UNITS  *  " + entry.mining + " MINING", s.labelMuted, 0.68)).left().padTop(gap.xs);
        head.add(headText).growX();
        p.add(head).growX().row();

        var currentAssignment = state.fleetAssignments[typeName];
        if(!Array.isArray(currentAssignment)) currentAssignment = currentAssignment ? [currentAssignment] : [];
        var assignRow = new Table();
        assignRow.left();
        for(var i = 0; i < resourceOptions.length; i++){
            (function(item, idx){
                if(item == null) return;
                var itemName = String(item.name);
                var selected = currentAssignment.indexOf(itemName) !== -1;
                var b = new Button(s.tile);
                b.setChecked(selected);
                b.clicked(run(function(){
                    var list = state.fleetAssignments[typeName];
                    if(!Array.isArray(list)) list = list ? [list] : [];
                    var pos = list.indexOf(itemName);
                    if(pos !== -1){
                        list.splice(pos, 1);
                        callHandler("command", {command: "mining:fleetToggleItem", unitType: typeName, item: itemName, enabled: false});
                    }else{
                        list.push(itemName);
                        callHandler("command", {command: "mining:fleetToggleItem", unitType: typeName, item: itemName, enabled: true});
                    }
                    if(list.length === 0){
                        delete state.fleetAssignments[typeName];
                    }else{
                        state.fleetAssignments[typeName] = list;
                    }
                    rebuildContent();
                }));
                var iconBack = new Table();
                iconBack.background(selected ? s.d.panelCyan : s.d.panelDark);
                iconBack.image(regionDrawable(item.uiIcon)).size(28).color(contentColor(item, theme.cyan));
                b.add(iconBack).size(46);
                assignRow.add(b).size(50).padRight(gap.xs).padTop(gap.xs);
                if((idx + 1) % 5 === 0) assignRow.row();
            })(resourceOptions[i], i);
        }
        var clearBtn = textButton("X", s.danger, function(){
            delete state.fleetAssignments[typeName];
            callHandler("command", {command: "mining:fleetClear", unitType: typeName});
            rebuildContent();
        });
        assignRow.add(clearBtn).size(50).padTop(gap.xs);
        p.add(assignRow).left().padTop(gap.md).row();

        var statusText = currentAssignment.length > 0 ? ("TARGET: " + currentAssignment.map(function(n){ return n.toUpperCase(); }).join(", ")) : "NO_ASSIGNMENT";
        p.add(label(statusText, currentAssignment.length > 0 ? s.labelCyan : s.labelDim, 0.7)).left().padTop(gap.sm);
        return p;
    }


    function findItemByName(name){
        var items = getItems();
        for(var i = 0; i < items.length; i++){
            try{
                if(String(items[i].name).toLowerCase() === String(name).toLowerCase()) return items[i];
            }catch(e){}
        }
        return null;
    }

    function miningPriorityTile(item, command){
        var s = getStyles();
        var selected = item != null && state.selectedMiningTarget === String(item.name);
        var b = new Button(selected ? getStyles().tile : getStyles().tile);
        b.setChecked(selected);
        b.top();
        b.clicked(run(function(){
            if(item != null){
                state.selectedMiningTarget = String(item.name);
            }
            callHandler("command", {command: command, item: item});
            callHandler("command", {command: "mining:applyGlobalBuffs"});
            rebuildContent();
        }));
        var iconBack = new Table();
        iconBack.background(selected ? s.d.panelCyan : s.d.panel);
        if(item != null){
            iconBack.image(regionDrawable(item.uiIcon)).size(42).color(contentColor(item, theme.cyan));
        }else{
            iconBack.image(getIcon("box", "database")).size(42).color(theme.dim);
        }
        b.add(iconBack).size(66).padTop(gap.md).row();
        b.add(label(item == null ? "UNKNOWN" : String(item.localizedName).toUpperCase(), selected ? s.labelCyan : s.labelMuted, 0.72)).center().padTop(gap.md);
        return b;
    }

    function buildPlayer(parent){
        var s = getStyles();

        var head = new Table();
        head.top().left();
        var intro = new Table();
        intro.left();
        intro.add(label("SUBSYSTEM / CORE_INTERFACE", s.labelDim, 0.72)).left().row();
        intro.add(label("PLAYER INTERFACE", s.label, 1.72)).left().padTop(gap.sm);

        var pilot = panel(s.d.panelCyan, gap.lg);
        var pilotTop = new Table();
        pilotTop.left();
        pilotTop.add(label("DESIGNATION", s.labelMuted, 0.72)).left().growX();
        pilotTop.add(label("SYNC_RATE", s.labelMuted, 0.72)).right();
        pilot.add(pilotTop).growX().row();
        var pilotBottom = new Table();
        pilotBottom.left();
        pilotBottom.add(label("PILOT_ID: VANGUARD-01", s.labelCyan, 1.14)).left().growX();
        pilotBottom.add(label("99.8%", s.label, 1.14)).right();
        pilot.add(pilotBottom).growX().padTop(gap.sm);

        if(state.compact){
            head.add(intro).growX().left().row();
            head.add(pilot).growX().padTop(gap.lg).row();
        }else{
            head.add(intro).growX().left();
            head.add(pilot).width(520).top();
        }
        parent.add(head).growX().row();

        var main = new Table();
        main.top().left();

        var leftCol = new Table();
        leftCol.top().left();
        var unit = panel(s.d.panelCyan, gap.xl);
        var unitHead = new Table();
        unitHead.left();
        unitHead.add(label("UNIT CHARACTERISTICS", s.label, 1.12)).left().growX();
        if(state.compact){
            unit.add(unitHead).growX().row();
            var unitActions = new Table();
            unitActions.left();
            unitActions.add(textButton("APPLY", s.primary, function(){ callHandler("command", {command: "player:applyStats"}); })).height(44).minWidth(120).padRight(gap.sm);
            unitActions.add(textButton("RESET", s.action, function(){ callHandler("command", {command: "player:resetStats"}); })).height(44).minWidth(120);
            unit.add(unitActions).left().padTop(gap.md).row();
        }else{
            unitHead.add(textButton("APPLY", s.primary, function(){ callHandler("command", {command: "player:applyStats"}); })).height(44).minWidth(120).padRight(gap.sm);
            unitHead.add(textButton("RESET", s.action, function(){ callHandler("command", {command: "player:resetStats"}); })).height(44).minWidth(120);
            unit.add(unitHead).growX().row();
        }
        var statGrid = new Table();
        statGrid.top().left();
        var hpSlider = liveSliderBlock("MAX_HEALTH", 100, 50000, 100, state.playerMaxHealth, function(v){ return Math.round(v) + " HP"; }, "MIN: 100", "", "MAX: 50.0k", theme.cyan, function(v){ state.playerMaxHealth = v; });
        var moveSlider = liveSliderBlock("MOVEMENT_SPEED", 1, 25, 0.1, state.playerMoveSpeed, function(v){ return v.toFixed(2) + " M/S"; }, "MIN: 1.0", "", "MAX: 25.0", theme.cyan, function(v){ state.playerMoveSpeed = v; });
        var jumpSlider = liveSliderBlock("JUMP_IMPULSE", 0, 50, 0.1, state.playerJumpImpulse, function(v){ return v.toFixed(1) + " G"; }, "MIN: 0.0", "", "MAX: 50.0", theme.cyan, function(v){ state.playerJumpImpulse = v; });
        var mineSlider = liveSliderBlock("MINING_SPEED_MULT", 0.1, 10, 0.05, state.playerMineSpeedMult, function(v){ return "x" + v.toFixed(2); }, "MIN: 0.1", "", "MAX: 10.0", theme.cyan, function(v){ state.playerMineSpeedMult = v; });
        if(state.compact){
            statGrid.add(hpSlider).growX().row();
            statGrid.add(moveSlider).growX().padTop(gap.lg).row();
            statGrid.add(jumpSlider).growX().padTop(gap.lg).row();
            statGrid.add(mineSlider).growX().padTop(gap.lg);
        }else{
            statGrid.add(hpSlider).growX().padRight(gap.xl);
            statGrid.add(moveSlider).growX().row();
            statGrid.add(jumpSlider).growX().padTop(gap.lg).padRight(gap.xl);
            statGrid.add(mineSlider).growX().padTop(gap.lg);
        }
        unit.add(statGrid).growX().padTop(gap.xl);
        leftCol.add(unit).growX().row();

        var repair = panel(s.d.panel, gap.xl);
        var repairHead = new Table();
        repairHead.left();
        repairHead.add(label("REPAIR SUBSYSTEMS", s.label, 1.1)).left().growX();
        var autoRepair = textButton(state.playerAutoRepair ? "AUTO-REPAIR: ON" : "AUTO-REPAIR: OFF", state.playerAutoRepair ? s.primary : s.action, function(){
            state.playerAutoRepair = !state.playerAutoRepair;
            callHandler("command", {command: "player:autoRepair", value: state.playerAutoRepair});
            rebuildContent();
        });
        autoRepair.setChecked(state.playerAutoRepair);
        repairHead.add(autoRepair).height(44).minWidth(180);
        repair.add(repairHead).growX().row();
        var repairBody = new Table();
        repairBody.top().left();
        var regenSlider = liveSliderBlock("REGEN_TICK_RATE (HP/T)", 0, 2000, 10, state.playerRegen, function(v){ return "+" + Math.round(v) + " HP/S"; }, "", "", "", theme.cyan, function(v){ state.playerRegen = v; });
        if(state.compact){
            repairBody.add(regenSlider).growX().row();
            repairBody.add(summaryCard("LIVE STATUS", "OPTIMAL", s.label, s.d.panelGold)).growX().height(150).padTop(gap.lg).row();
        }else{
            repairBody.add(regenSlider).growX().padRight(gap.xl);
            repairBody.add(summaryCard("LIVE STATUS", "OPTIMAL", s.label, s.d.panelGold)).width(220).height(150).top();
        }
        repair.add(repairBody).growX().padTop(gap.xl);
        leftCol.add(repair).growX().padTop(gap.lg);

        var rightCol = new Table();
        rightCol.top().left();
        var statuses = panel(s.d.panelCyan, gap.xl);
        statuses.add(label("STATUS OVERRIDES", s.label, 1.12)).left().row();
        var statusGrid = new Table();
        statusGrid.left();
        var buttons = [
            statusOverrideButton("OVERDRIVE", s.d.actionUp, s.label, "player:status:overdrive"),
            statusOverrideButton("FAST", s.d.panel, s.labelDim, "player:status:fast"),
            statusOverrideButton("INVINCIBLE", s.d.panelCyan, s.labelCyan, "player:status:invincible"),
            statusOverrideButton("BURNING", s.d.panelRed, s.labelRed, "player:status:burning"),
            statusOverrideButton("FREEZING", s.d.panel, s.labelDim, "player:status:freezing"),
            statusOverrideButton("SHOCKED", s.d.panelGold, s.labelGold, "player:status:shocked"),
            statusOverrideButton("CLOAKED", s.d.panel, s.labelDim, "player:status:cloaked"),
            statusOverrideButton("CORRODED", s.d.panel, s.labelDim, "player:status:corroded")
        ];
        var statusCols = state.compact ? 1 : 2;
        for(var pi = 0; pi < buttons.length; pi++){
            statusGrid.add(buttons[pi]).growX().height(72).minWidth(state.compact ? 0 : 210).padRight(gap.md).padBottom(gap.md);
            if((pi + 1) % statusCols === 0) statusGrid.row();
        }
        statuses.add(statusGrid).growX().padTop(gap.lg);
        rightCol.add(statuses).growX().row();

        var commands = panel(s.d.panelGold, gap.xl);
        commands.add(label("QUICK COMMANDS", s.label, 1.1)).left().row();
        commands.add(textButton("HEAL TO MAX", s.primary, function(){ callHandler("command", {command: "player:healMax"}); })).growX().height(58).padTop(gap.lg).row();
        commands.add(textButton("REFILL AMMO", s.action, function(){ callHandler("command", {command: "player:refillAmmo"}); })).growX().height(58).padTop(gap.md).row();
        commands.add(textButton("SELF-DESTRUCT", s.danger, function(){ callHandler("command", {command: "player:selfDestruct"}); })).growX().height(64).padTop(gap.lg);
        rightCol.add(commands).growX().padTop(gap.lg);

        if(state.compact){
            main.add(leftCol).growX().row();
            main.add(rightCol).growX().padTop(gap.lg);
        }else{
            main.add(leftCol).growX().padRight(gap.xl);
            main.add(rightCol).width(560).top();
        }
        parent.add(main).growX().padTop(gap.xl).row();
    }