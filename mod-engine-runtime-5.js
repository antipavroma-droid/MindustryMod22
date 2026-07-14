if(cmd === "mining:applyGlobalBuffs"){
            var mineTarget = playerUnit();
            var mineItem = null;
            try{ mineItem = Vars.content.item(ui != null && ui.state != null ? ui.state.selectedMiningTarget : "titanium"); }catch(eItem){}
            if(mineTarget == null){
                notify("NO CONTROLLED UNIT");
                if(ui != null && ui.state != null) ui.state.miningProtocolActive = false;
                return;
            }
            if(mineItem == null){
                notify("INVALID ORE TARGET");
                return;
            }
            var mineOk = commandUnitMine(mineTarget, mineItem, true);
            if(ui != null && ui.state != null){
                ui.state.miningProtocolActive = mineOk;
                try{ Vars.state.rules.unitMineSpeedMultiplier = Math.max(1, ui.state.miningSpeed); }catch(eSpd){}
                try{ Vars.state.rules.buildSpeedMultiplier = ui.state.miningDrillBoost ? 2 : 1; }catch(eBld){}
            }
            if(mineOk){
                notify("UNIT MINING: " + mineItem.localizedName);
            }else{
                var capMsg = "NO ORE FOUND NEARBY";
                try{
                    if(mineTarget.type != null && mineItem.hardness > mineTarget.type.mineTier){
                        capMsg = "UNIT MINE TIER TOO LOW FOR " + mineItem.localizedName;
                    }
                }catch(eCap){}
                notify(capMsg);
            }
            return;
        }
        if(cmd === "mining:stopProtocol"){
            clearUnitMining(playerUnit(), true);
            if(ui != null && ui.state != null){
                ui.state.miningProtocolActive = false;
            }
            notify("MINING PROTOCOL STOPPED");
            return;
        }
        if(cmd.indexOf("mining:priority:") === 0){
            var priorityName = cmd.substring("mining:priority:".length);
            if(ui != null && ui.state != null && ui.state.miningProtocolActive){
                var priorityItem = null;
                try{ priorityItem = Vars.content.item(priorityName); }catch(ePr){}
                if(priorityItem != null){
                    var reOk = commandUnitMine(playerUnit(), priorityItem, true);
                    notify(reOk ? ("MINING PRIORITY: " + priorityName.toUpperCase()) : "NO ORE FOUND NEARBY");
                    return;
                }
            }
            notify("MINING PRIORITY: " + priorityName.toUpperCase());
            return;
        }
        if(cmd === "mining:fleetToggleItem"){
            var fleetType = payload.unitType == null ? null : String(payload.unitType);
            var fleetItemName = payload.item == null ? null : String(payload.item);
            var enabled = !!payload.enabled;
            if(fleetType == null){
                notify("NO UNIT TYPE SELECTED");
                return;
            }
            var fleetItem = null;
            try{ fleetItem = Vars.content.item(fleetItemName); }catch(eFI){}
            if(fleetItem == null){
                notify("INVALID ORE TARGET");
                return;
            }
            var fleetTeam = playerTeam();
            var fleetCount = countFleetUnits(fleetType, fleetTeam);
            if(fleetCount === 0){
                notify("NO UNITS OF THIS TYPE ON MAP");
                return;
            }
            var fleetSample = null;
            eachFleetUnit(fleetType, fleetTeam, function(u){ if(fleetSample == null) fleetSample = u; });
            try{
                if(enabled && fleetSample != null && fleetSample.type != null && fleetItem.hardness > fleetSample.type.mineTier){
                    notify("UNIT MINE TIER TOO LOW FOR " + fleetItem.localizedName);
                    return;
                }
            }catch(eCapFleet){}

            var currentList = fleetAssignments[fleetType];
            if(!Array.isArray(currentList)) currentList = currentList ? [currentList] : [];
            var pos = currentList.indexOf(fleetItemName);
            if(enabled && pos === -1) currentList.push(fleetItemName);
            if(!enabled && pos !== -1) currentList.splice(pos, 1);
            if(currentList.length === 0){
                delete fleetAssignments[fleetType];
            }else{
                fleetAssignments[fleetType] = currentList;
            }

            var fleetAssigned = toggleFleetMiningItem(fleetType, fleetItem, enabled, fleetTeam);
            notify((enabled ? "ADDED " : "REMOVED ") + fleetItem.localizedName.toUpperCase() + " (" + fleetAssigned + " UNITS, " + currentList.length + " ORES ACTIVE)");
            return;
        }
        if(cmd === "mining:fleetClear"){
            var clearType = payload.unitType == null ? null : String(payload.unitType);
            if(clearType == null) return;
            delete fleetAssignments[clearType];
            clearFleetMining(clearType, playerTeam());
            notify("FLEET MINING CLEARED");
            return;
        }
        if(cmd.indexOf("links:") === 0){
            notify("LINK EXEC: " + cmd.substring(6));
            return;
        }
        if(cmd.indexOf("console:") === 0){
            var scripts = scriptsApi();
            if(cmd === "console:clearLog"){
                if(ui != null && ui.state != null) ui.state.consoleLines = [];
                try{ if(ui != null && ui.state != null && ui.state.tab === "console") ui.rebuild(); }catch(e){}
                notify("CONSOLE CLEARED");
                return;
            }
            if(cmd === "console:exportTrace"){
                try{
                    var out = ui != null && ui.state != null && ui.state.consoleLines != null ? ui.state.consoleLines.join("\n") : "";
                    Core.app.setClipboardText(out);
                    notify("TRACE COPIED");
                }catch(e2){
                    notify("TRACE EXPORT FAILED");
                }
                return;
            }
            if(cmd === "console:runProtocol"){
                try{
                    var text = payload.text;
                    if(text == null || String(text).length === 0) return;
                    appendConsole(") " + text);
                    var result = "Scripts unavailable";
                    try{
                        if(scripts != null) result = scripts.runConsole(String(text));
                    }catch(ex){
                        result = "Exception: " + ex;
                    }
                    appendConsole("<- " + result);
                }catch(e3){
                    notify("CONSOLE EXEC FAILED");
                }
                return;
            }
            if(cmd.indexOf("console:alias:") === 0){
                var alias = cmd.substring("console:alias:".length);
                var sample = alias + ".toString()";
                appendConsole(") " + sample);
                var aliasResult = "Scripts unavailable";
                try{
                    if(scripts != null) aliasResult = scripts.runConsole(sample);
                }catch(ex2){
                    aliasResult = "Exception: " + ex2;
                }
                appendConsole("<- " + aliasResult);
                return;
            }
            notify("CONSOLE EXEC: " + cmd.substring(8));
            return;
        }
        if(cmd.indexOf("hotkeys:") === 0){
            if(cmd === "hotkeys:saveExit"){
                try{ if(ui != null) ui.hide(); }catch(e){}
            }
            notify("HOTKEYS EXEC: " + cmd.substring(8));
            return;
        }

        notify("COMMAND: " + cmd);
    }