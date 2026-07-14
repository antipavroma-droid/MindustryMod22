function groupUnitCount(){
        var total = 0;
        try{
            Groups.unit.each(cons(function(unit){
                total++;
            }));
        }catch(e){}
        return total;
    }

    function activeTurretCount(){
        var total = 0;
        var team = playerTeamRef();
        try{
            Groups.build.each(cons(function(build){
                try{
                    if(build.block == null || !(build.block instanceof Turret)) return;
                    var buildTeam = null;
                    try{ buildTeam = build.team(); }catch(eT){ try{ buildTeam = build.team; }catch(eT2){} }
                    if(team != null && buildTeam != null && buildTeam != team) return;
                    total++;
                }catch(eInner){}
            }));
        }catch(e){}
        return total;
    }

    function collectTurretRanges(){
        var result = [];
        try{
            eachSeq(Vars.content.blocks(), function(block){
                try{
                    if(!(block instanceof Turret)) return;
                    if(!visibleContent(block)) return;
                    result.push({block: block, range: block.range});
                }catch(eInner){}
            });
        }catch(e){}
        result.sort(function(a, b){ return b.range - a.range; });
        return result;
    }

    function unitWeaponRange(unitType){
        try{
            if(unitType != null && unitType.weapons != null && unitType.weapons.size > 0){
                var weapon = unitType.weapons.first();
                if(weapon != null && weapon.bullet != null && weapon.bullet.speed > 0 && weapon.bullet.lifetime > 0){
                    return weapon.bullet.speed * weapon.bullet.lifetime;
                }
            }
        }catch(e){}
        return 0;
    }

    function collectUnitWeaponRanges(){
        var result = [];
        try{
            eachSeq(Vars.content.units(), function(unitType){
                try{
                    if(!visibleContent(unitType)) return;
                    var range = unitWeaponRange(unitType);
                    if(range > 0) result.push({type: unitType, range: range});
                }catch(eInner){}
            });
        }catch(e){}
        result.sort(function(a, b){ return b.range - a.range; });
        return result;
    }

    function collectUnitMineRanges(){
        var result = [];
        try{
            eachSeq(Vars.content.units(), function(unitType){
                try{
                    if(!visibleContent(unitType)) return;
                    if(unitType.mineTier < 0 || unitType.mineSpeed <= 0) return;
                    var range = 0;
                    try{ range = unitType.mineRange; }catch(eRange){}
                    if(range > 0) result.push({type: unitType, range: range});
                }catch(eInner){}
            });
        }catch(e){}
        result.sort(function(a, b){ return b.range - a.range; });
        return result;
    }

    function getCoreItemFlow(){
        var now = 0;
        try{ now = Time.time; }catch(eTime){}
        if(now - itemFlowPrevTime >= 60 || itemFlowPrevSnapshot == null){
            var current = {};
            try{
                var team = playerTeamRef();
                if(team != null){
                    try{
                        // All cores belonging to one team share a single common item pool
                        // (confirmed: Mindustry issue #1417). Reading from one core is enough -
                        // summing across team.cores() would count the same shared total once
                        // per core and inflate both the displayed amount and the delta.
                        var firstCore = team.cores().size > 0 ? team.cores().first() : null;
                        if(firstCore != null){
                            Vars.content.items().each(cons(function(item){
                                try{
                                    var key = String(item.name);
                                    current[key] = firstCore.items.get(item);
                                }catch(eItem){}
                            }));
                        }
                    }catch(eCores){}
                }
            }catch(e){}
            if(itemFlowPrevSnapshot != null){
                var rates = {};
                for(var key in current){
                    var before = itemFlowPrevSnapshot[key] || 0;
                    rates[key] = current[key] - before;
                }
                itemFlowRates = rates;
            }
            itemFlowPrevSnapshot = current;
            itemFlowPrevTime = now;
        }
        return {totals: itemFlowPrevSnapshot || {}, rates: itemFlowRates};
    }

    function netPowerBalance(){
        var team = playerTeamRef();
        var seenGraphs = {};
        var total = 0;
        var hasAny = false;
        try{
            Groups.build.each(cons(function(build){
                try{
                    if(build.power == null || build.power.graph == null) return;
                    var buildTeam = null;
                    try{ buildTeam = build.team(); }catch(eT){ try{ buildTeam = build.team; }catch(eT2){} }
                    if(team != null && buildTeam != null && buildTeam != team) return;
                    var graph = build.power.graph;
                    var gid = null;
                    try{ gid = graph.getID(); }catch(eGid){ try{ gid = graph.getId(); }catch(eGid2){} }
                    if(gid == null || seenGraphs[gid]) return;
                    seenGraphs[gid] = true;
                    hasAny = true;
                    total += graph.getPowerBalance() * 60;
                }catch(eInner){}
            }));
        }catch(e){}
        return {value: total, hasNetwork: hasAny};
    }

    function enemyUnitCount(){
        var total = 0;
        var team = null;
        try{ team = Vars.state == null || Vars.state.rules == null ? null : Vars.state.rules.waveTeam; }catch(e){}
        try{
            Groups.unit.each(cons(function(unit){
                try{
                    if(team != null && unit.team() == team) total++;
                }catch(e2){}
            }));
        }catch(e3){}
        return total;
    }

    function currentSectorLabel(){
        try{
            var sector = Vars.state != null && Vars.state.rules != null ? Vars.state.rules.sector : null;
            if(sector != null){
                try{
                    if(sector.preset != null) return String(sector.preset.localizedName).toUpperCase();
                }catch(ePreset){}
                try{
                    return "SECTOR " + sector.id;
                }catch(eId){}
            }
        }catch(e){}
        try{
            if(Vars.state != null && Vars.state.map != null) return String(Vars.state.map.name()).toUpperCase();
        }catch(e2){}
        return "UNKNOWN_SECTOR";
    }

    function threatLevelInfo(){
        var ratio = waveThreatRatio();
        var label = "LOW";
        var style = getStyles().labelCyan;
        if(ratio > 0.75){
            label = "EXTREME";
            style = getStyles().labelRed;
        }else if(ratio > 0.45){
            label = "HIGH";
            style = getStyles().labelGold;
        }else if(ratio > 0.2){
            label = "NOMINAL";
            style = getStyles().labelCyan;
        }
        return {text: label, style: style};
    }

    function waveThreatRatio(){
        var wave = currentWaveIndex();
        var maxWave = 200;
        try{ if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.winWave > 0) maxWave = Vars.state.rules.winWave; }catch(e){}
        return Math.max(0.05, Math.min(1, wave / Math.max(20, maxWave)));
    }

    function waveSpawnRate(){
        var enemies = enemyUnitCount();
        var wave = currentWaveIndex();
        return Math.max(1, (enemies / 12) + wave * 0.08);
    }

    function waveBossEstimate(){
        var wave = currentWaveIndex();
        var nextBoss = Math.ceil((wave + 1) / 10) * 10;
        return nextBoss;
    }

    function playerMiningUnitCount(){
        var total = 0;
        var team = null;
        try{ team = Vars.player == null ? null : Vars.player.team(); }catch(e){}
        try{
            Groups.unit.each(cons(function(unit){
                try{
                    if(team != null && unit.team() == team && unit.type != null && unit.type.mineTier >= 0 && unit.type.mineSpeed > 0) total++;
                }catch(e2){}
            }));
        }catch(e3){}
        return total;
    }

    function collectFleetMinerTypes(){
        var team = null;
        try{ team = Vars.player == null ? null : Vars.player.team(); }catch(e){}
        var groups = {};
        var order = [];
        try{
            if(team != null){
                var data = team.data();
                if(data != null && data.units != null){
                    var list = data.units;
                    for(var i = 0; i < list.size; i++){
                        try{
                            var unit = list.items[i];
                            if(unit == null || unit.type == null || unit.type.mineTier < 0 || unit.type.mineSpeed <= 0) continue;
                            var key = String(unit.type.name);
                            if(groups[key] == null){
                                groups[key] = {type: unit.type, count: 0, mining: 0};
                                order.push(key);
                            }
                            groups[key].count++;
                            var active = false;
                            try{ active = unit.mining(); }catch(eM){
                                try{ active = unit.mineTile() != null; }catch(eM2){}
                            }
                            if(active) groups[key].mining++;
                        }catch(eInner){}
                    }
                }
            }
        }catch(e){}
        var result = [];
        for(var i = 0; i < order.length; i++) result.push(groups[order[i]]);
        return result;
    }

    function playerMiningStatus(){
        var status = {active: false, tile: null, item: null, fill: 0, capacity: 0, name: "NO_UNIT"};
        var pu = null;
        try{ pu = Vars.player == null ? null : Vars.player.unit(); }catch(e){}
        if(pu == null) return status;
        try{ status.name = String(pu.type.localizedName).toUpperCase(); }catch(e2){}
        try{ status.tile = pu.mineTile(); }catch(e3){ try{ status.tile = pu.mineTile; }catch(e4){} }
        try{ status.active = pu.mining(); }catch(e5){ status.active = status.tile != null; }
        try{ status.item = pu.stack != null ? pu.stack.item : null; }catch(e6){}
        try{ status.fill = pu.stack != null ? pu.stack.amount : 0; }catch(e7){}
        try{ status.capacity = pu.type != null ? pu.type.itemCapacity : 0; }catch(e8){}
        return status;
    }

    function currentWaveIndex(){
        var wave = 0;
        try{ wave = Vars.state.wave; }catch(e){}
        if(wave != null && wave > 0) return wave;
        return state.waveIndex;
    }

    function getWaveComposition(wave){
        var result = [];
        try{
            var spawns = Vars.state.rules.spawns;
            if(spawns == null) return result;
            eachSeq(spawns, function(group){
                try{
                    if(group.type == null) return;
                    var count = group.getSpawned(wave - 1);
                    if(count > 0){
                        result.push({type: group.type, count: count});
                    }
                }catch(eGroup){}
            });
        }catch(e){}
        return result;
    }

    function currentWaveTimeTicks(){
        try{
            if(Vars.state != null && Vars.state.wavetime != null) return Vars.state.wavetime;
        }catch(e){}
        return 39 * 60;
    }

    function currentWaveSpacingTicks(){
        try{
            if(Vars.state != null && Vars.state.rules != null && Vars.state.rules.waveSpacing != null && Vars.state.rules.waveSpacing > 0) return Vars.state.rules.waveSpacing;
        }catch(e){}
        return 2 * 3900;
    }

    function waveCountdownText(){
        var ticks = Math.max(0, currentWaveTimeTicks());
        var totalSeconds = Math.floor(ticks / 60);
        var minutes = Math.floor(totalSeconds / 60);
        var seconds = totalSeconds % 60;
        var sec = seconds < 10 ? "0" + seconds : "" + seconds;
        return minutes + ":" + sec;
    }

    function waveCountdownRatio(){
        var spacing = Math.max(1, currentWaveSpacingTicks());
        var time = Math.max(0, Math.min(spacing, currentWaveTimeTicks()));
        return time / spacing;
    }

    function dynamicGaugeDrawable(provider, accent){
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                var safe = Math.max(0, Math.min(1, provider()));
                var cx = x + width / 2;
                var cy = y + height / 2;
                var radius = Math.min(width, height) * 0.35;
                Draw.color(theme.lineSoft);
                Lines.stroke(7);
                Lines.circle(cx, cy, radius);
                Draw.color(accent);
                try{
                    Lines.arc(cx, cy, radius, safe, 90);
                }catch(e){
                    Lines.circle(cx, cy, radius);
                }
                Draw.reset();
            }
        });
    }

    function waveTimerPanel(){
        var s = getStyles();
        var p = panel(s.d.panelStrong, gap.xl);
        p.center();

        var timer = new Stack();
        var gauge = new Table();
        gauge.background(dynamicGaugeDrawable(function(){ return waveCountdownRatio(); }, theme.gold));
        var timerText = new Table();
        timerText.center();
        timerText.add(label("NEXT WAVE", s.labelMuted, 0.78)).center().row();
        var timeLabel = label(waveCountdownText(), s.labelGold, 2.15);
        timerText.add(timeLabel).center().row();
        timerText.add(label("SECONDS", s.labelMuted, 0.7)).center().padTop(gap.xs);
        timer.add(gauge);
        timer.add(timerText);
        timer.update(run(function(){
            timeLabel.setText(waveCountdownText());
        }));
        p.add(timer).size(260).center().row();

        var actions = new Table();
        actions.center();
        actions.add(textButton("RUN_WAVE", s.primary, function(){
            callHandler("command", {command: "waves:run", wave: currentWaveIndex()});
        })).height(58).minWidth(170).padRight(gap.md);
        actions.add(textButton("RESET", s.action, function(){
            state.waveIndex = 1;
            callHandler("command", {command: "waves:reset"});
            rebuildContent();
        })).height(58).minWidth(170);
        p.add(actions).center().padTop(gap.lg);
        return p;
    }

    function waveIndexPanel(){
        var s = getStyles();
        var t = new Table();
        t.left();
        t.add(label("# CURRENT_INDEX", s.labelGold, 0.82)).left().row();

        var valueBox = new Table();
        valueBox.background(getStyles().d.actionUp);
        valueBox.left();
        var waveField = inlineNumberField(currentWaveIndex(), 0, 99999, s.label.fontColor, function(num){
            state.waveIndex = num;
            callHandler("command", {command: "waves:index", wave: num});
        });
        valueBox.add(waveField).left().growX().height(56).padLeft(gap.lg);
        var buttons = new Table();
        buttons.add(textButton("+", s.action, function(){
            state.waveIndex = currentWaveIndex() + 1;
            callHandler("command", {command: "waves:index", wave: state.waveIndex});
            rebuildContent();
        })).size(40).row();
        buttons.add(textButton("-", s.action, function(){
            state.waveIndex = Math.max(0, currentWaveIndex() - 1);
            callHandler("command", {command: "waves:index", wave: state.waveIndex});
            rebuildContent();
        })).size(40);
        valueBox.add(buttons).right().padRight(gap.md);
        t.add(valueBox).growX().height(90).padTop(gap.md).row();

        var minMax = new Table();
        minMax.add(label("MIN: 0", s.labelDim, 0.66)).left().growX();
        minMax.add(label("MAX: 99,999", s.labelDim, 0.66)).right();
        t.add(minMax).growX().padTop(gap.sm);
        return t;
    }

    function waveDifficultyPanel(){
        var s = getStyles();
        var t = new Table();
        t.left();
        var ratio = waveThreatRatio();
        var percent = Math.round(ratio * 100) + "%";
        t.add(label("DIFFICULTY_MODIFIER", s.labelGold, 0.82)).left().row();
        t.add(metricLine(percent, ratio > 0.75 ? "EXTREME_THREAT" : (ratio > 0.45 ? "NOMINAL_THREAT" : "LOW_THREAT"), ratio, ratio > 0.75 ? theme.red : theme.gold)).growX().padTop(gap.md).row();
        t.add(label("scaling_factor = current_wave * 1.15", s.labelDim, 0.72)).left().padTop(gap.sm);
        return t;
    }

    function waveStat(title, value, style, accent){
        var s = getStyles();
        var t = panel(accent === theme.red ? s.d.panelRed : s.d.panel, gap.md);
        t.add(label(title, s.labelMuted, 0.7)).left().row();
        t.add(label(value, style || s.labelGold, 1.22)).left().padTop(gap.xs);
        return t;
    }

    function waveTableWidths(){
        return state.compact ? [72, 112, 126, 92, 104] : [110, 180, 190, 160, 150];
    }

    function waveHistoryRow(table, index, elapsed, resources, threat, result){
        var s = getStyles();
        var w = waveTableWidths();
        table.add(label(index, s.labelGold, 0.82)).width(w[0]).left().pad(gap.md);
        table.add(label(elapsed, s.label, 0.82)).width(w[1]).left().pad(gap.md);
        table.add(label(resources, s.labelCyan, 0.82)).width(w[2]).left().pad(gap.md);
        var threatBar = new Table();
        threatBar.background(progressDrawable(threat, theme.red));
        table.add(threatBar).width(w[3]).height(8).left().pad(gap.md);
        table.add(label(result, s.labelGold, 0.7)).width(w[4]).left().pad(gap.md).row();
    }