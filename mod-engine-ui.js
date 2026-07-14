(function(){
var ArcCore = Packages.arc.Core;
var Time = Packages.arc.util.Time;
var Color = Packages.arc.graphics.Color;
var Draw = Packages.arc.graphics.g2d.Draw;
var Fill = Packages.arc.graphics.g2d.Fill;
var Lines = Packages.arc.graphics.g2d.Lines;
var Align = Packages.arc.util.Align;
var Log = Packages.arc.util.Log;

var BaseDrawable = Packages.arc.scene.style.BaseDrawable;
var TextureRegionDrawable = Packages.arc.scene.style.TextureRegionDrawable;

var Table = Packages.arc.scene.ui.layout.Table;
var Stack = Packages.arc.scene.ui.layout.Stack;
var Button = Packages.arc.scene.ui.Button;
var TextButton = Packages.arc.scene.ui.TextButton;
var ImageButton = Packages.arc.scene.ui.ImageButton;
var Label = Packages.arc.scene.ui.Label;
var TextField = Packages.arc.scene.ui.TextField;
var Slider = Packages.arc.scene.ui.Slider;
var ScrollPane = Packages.arc.scene.ui.ScrollPane;

var Vars = Packages.mindustry.Vars;
var Styles = Packages.mindustry.ui.Styles;
var Tex = Packages.mindustry.ui.Tex;
var Fonts = Packages.mindustry.ui.Fonts;
var Icon = Packages.mindustry.gen.Icon;
var Groups = Packages.mindustry.gen.Groups;
var BaseDialog = Packages.mindustry.ui.dialogs.BaseDialog;
var Turret = Packages.mindustry.world.blocks.defense.turrets.Turret;

var ModEngineUI = (function(){
    var theme = {
        bg: Color.valueOf("0b1118"),
        bg2: Color.valueOf("0f151d"),
        side: Color.valueOf("0c1219"),
        panel: Color.valueOf("121922"),
        panel2: Color.valueOf("171e28"),
        panel3: Color.valueOf("202833"),
        line: Color.valueOf("2c3542"),
        lineSoft: Color.valueOf("202833"),
        text: Color.valueOf("d8dde7"),
        muted: Color.valueOf("a99f91"),
        dim: Color.valueOf("646b76"),
        gold: Color.valueOf("ffd28a"),
        goldDark: Color.valueOf("4a3924"),
        cyan: Color.valueOf("10e5e5"),
        cyanDark: Color.valueOf("06383d"),
        red: Color.valueOf("ffb3ae"),
        redDark: Color.valueOf("401019"),
        green: Color.valueOf("31d17a"),
        black: Color.valueOf("05090f")
    };

    var gap = {
        xs: 4,
        sm: 8,
        md: 14,
        lg: 22,
        xl: 34
    };

    var state = {
        tab: "home",
        navMode: "all",
        tier: 1,
        amount: 1000,
        waveIndex: 156,
        autoWave: false,
        wavePreviewPage: 0,
        simSpeed: 1,
        unitPlanetFilter: "all",
        unitSpawnAmount: 1,
        unitSpawnEnemy: false,
        inspectorTier: 0,
        inspectorCategory: "all",
        inspectorPlanet: "all",
        inspectorPage: 0,
        inspectorPageSize: 100,
        inspectorGroupOpen: false,
        worldTimeOfDay: 14.33,
        worldWindStrength: 4.2,
        buildInstant: true,
        buildGodmode: false,
        playerAutoRepair: true,
        playerMaxHealth: 12500,
        playerMoveSpeed: 4.8,
        playerJumpImpulse: 12.5,
        playerMineSpeedMult: 1.25,
        playerRegen: 450,
        weaponCritEnabled: true,
        weaponGlobalDamage: 1.5,
        weaponInstantReload: false,
        weaponBulletDamage: 45,
        weaponRange: 240,
        weaponSpread: 0.5,
        turretReloadMult: 1.5,
        turretRangeBoost: 24,
        turretDamageBoost: 35,
        turretSpread: 0,
        showTurretRadii: false,
        showUnitRadii: false,
        miningDrillBoost: true,
        miningEfficiencyBoost: false,
        miningProtocolActive: false,
        miningRange: 124,
        miningSpeed: 8.5,
        miningTier: 5,
        selectedMiningTarget: "titanium",
        fleetAssignments: {},
        consoleInputText: "",
        consoleLines: [
            "System initialising... v8.0.42_stable built on kernel 0x2A",
            "Memory buffer verified. 128.4GB / 256.0GB available.",
            "Loading modules: logic_engine, wave_analyzer, unit_control... [OK]",
            "<- NexusOS Kernel V8.0 successfully engaged. Entering interactive shell."
        ],
        selectedItem: null,
        selectedUnit: null,
        unitCustomHealth: null,
        unitCustomShield: null,
        selectedWorldUnit: null,
        compact: false
    };

    var handlers = {};
    var dialog = null;
    var root = null;
    var sidebarHost = null;
    var navHost = null;
    var contentHost = null;
    var contentPane = null;
    var savedScrollY = 0;
    var navScrollPane = null;
    var savedNavScrollY = 0;
    var savedNavScrollX = 0;
    var styles = null;
    var itemFlowPrevSnapshot = null;
    var itemFlowPrevTime = 0;
    var itemFlowRates = {};

    function makeDrawable(fill, stroke, strokeWidth, accent, brackets){
        var background = fill;
        var border = stroke;
        var lineWidth = strokeWidth || 0;
        var accentColor = accent;
        var drawBrackets = brackets === true;

        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                Draw.color(background);
                Fill.rect(x + width / 2, y + height / 2, width, height);

                if(lineWidth > 0){
                    Draw.color(border);
                    Lines.stroke(lineWidth);
                    Lines.rect(x + lineWidth / 2, y + lineWidth / 2, width - lineWidth, height - lineWidth);
                }

                if(accentColor != null){
                    Draw.color(accentColor);
                    Fill.rect(x + width / 2, y + height - 1.5, width, 3);
                }

                if(drawBrackets){
                    var size = Math.min(18, Math.min(width, height) * 0.22);
                    Draw.color(accentColor == null ? border : accentColor);
                    Lines.stroke(2);
                    Lines.line(x, y + height, x + size, y + height);
                    Lines.line(x, y + height, x, y + height - size);
                    Lines.line(x + width, y, x + width - size, y);
                    Lines.line(x + width, y, x + width, y + size);
                }

                Draw.reset();
            }
        });
    }

    function progressDrawable(percent, accent){
        var safe = Math.max(0, Math.min(1, percent));
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                Draw.color(theme.lineSoft);
                Fill.rect(x + width / 2, y + height / 2, width, height);
                Draw.color(accent);
                Fill.rect(x + width * safe / 2, y + height / 2, width * safe, height);
                Draw.reset();
            }
        });
    }

    function dynamicProgressDrawable(provider, accentProvider){
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                var safe = Math.max(0, Math.min(1, provider()));
                var accent = accentProvider();
                Draw.color(theme.lineSoft);
                Fill.rect(x + width / 2, y + height / 2, width, height);
                Draw.color(accent);
                Fill.rect(x + width * safe / 2, y + height / 2, width * safe, height);
                Draw.reset();
            }
        });
    }

    function sliderDrawable(percent, accent){
        var safe = Math.max(0, Math.min(1, percent));
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                Draw.color(theme.lineSoft);
                Fill.rect(x + width / 2, y + height / 2, width, Math.min(10, height));
                Draw.color(accent);
                Fill.rect(x + width * safe, y + height / 2, 5, height + 16);
                Draw.reset();
            }
        });
    }

    function harmonicsDrawable(){
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
                Draw.color(theme.panel);
                Fill.rect(x + width / 2, y + height / 2, width, height);

                Draw.color(theme.lineSoft);
                Lines.stroke(1);
                for(var i = 1; i < 6; i++){
                    Lines.line(x + width * i / 6, y, x + width * i / 6, y + height);
                }

                for(var c = 0; c < 18; c++){
                    var px = x + width * (c + 0.5) / 18;
                    var h = height * (0.18 + (c % 5) * 0.07);
                    Draw.color(c % 4 === 0 ? theme.goldDark : theme.cyanDark);
                    Fill.rect(px, y + height * 0.42, width / 42, h);
                }

                Draw.color(theme.cyan);
                Lines.stroke(2);
                var lastX = x;
                var lastY = y + height * 0.54;
                for(var p = 1; p <= 36; p++){
                    var nx = x + width * p / 36;
                    var wave = Math.sin(p * 0.55) * 0.16 + Math.sin(p * 0.19) * 0.08;
                    var ny = y + height * (0.53 + wave);
                    Lines.line(lastX, lastY, nx, ny);
                    lastX = nx;
                    lastY = ny;
                }

                Draw.reset();
            }
        });
    }

    function gaugeDrawable(percent, accent){
        var safe = Math.max(0, Math.min(1, percent));
        return extend(BaseDrawable, {
            draw: function(x, y, width, height){
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

    function copyTextStyle(base, up, over, down, checked, font, fontColor, checkedColor){
        var style = new TextButton.TextButtonStyle(base);
        style.up = up;
        style.over = over;
        style.down = down;
        style.checked = checked;
        style.font = font;
        style.fontColor = fontColor;
        style.overFontColor = theme.gold;
        style.downFontColor = theme.cyan;
        style.checkedFontColor = checkedColor || theme.gold;
        return style;
    }

    function getStyles(){
        if(styles != null) return styles;

        var d = {
            screen: makeDrawable(theme.bg, theme.bg, 0, null, false),
            sidebar: makeDrawable(theme.side, theme.lineSoft, 1, null, false),
            topbar: makeDrawable(theme.panel, theme.lineSoft, 1, null, false),
            panel: makeDrawable(theme.panel, theme.line, 1, null, false),
            panelStrong: makeDrawable(theme.panel2, theme.line, 1, theme.gold, true),
            panelCyan: makeDrawable(theme.panel2, theme.cyan, 1, theme.cyan, false),
            panelGold: makeDrawable(theme.panel2, theme.gold, 1, theme.gold, false),
            panelRed: makeDrawable(theme.panel2, theme.red, 1, null, false),
            panelDark: makeDrawable(theme.black, theme.lineSoft, 1, null, false),
            navUp: makeDrawable(theme.side, theme.side, 0, null, false),
            navOver: makeDrawable(theme.panel2, theme.line, 1, null, false),
            navDown: makeDrawable(theme.panel3, theme.goldDark, 1, null, false),
            navChecked: makeDrawable(Color.valueOf("28251f"), theme.goldDark, 1, theme.gold, false),
            actionUp: makeDrawable(theme.panel3, theme.line, 1, null, false),
            actionOver: makeDrawable(Color.valueOf("2b3542"), theme.goldDark, 1, null, false),
            actionDown: makeDrawable(Color.valueOf("111820"), theme.cyanDark, 1, null, false),
            primaryUp: makeDrawable(theme.gold, theme.gold, 1, null, false),
            primaryOver: makeDrawable(Color.valueOf("ffe0a8"), theme.gold, 1, null, false),
            primaryDown: makeDrawable(Color.valueOf("d6a85e"), theme.goldDark, 1, null, false),
            dangerUp: makeDrawable(theme.redDark, Color.valueOf("7d3340"), 1, null, false),
            dangerOver: makeDrawable(Color.valueOf("5a1825"), theme.red, 1, null, false),
            dangerDown: makeDrawable(Color.valueOf("250911"), theme.red, 1, null, false),
            tileUp: makeDrawable(theme.panel, theme.lineSoft, 1, null, false),
            tileOver: makeDrawable(theme.panel2, theme.line, 1, null, false),
            tileDown: makeDrawable(theme.black, theme.cyanDark, 1, null, false),
            tileChecked: makeDrawable(theme.panel2, theme.cyan, 1, theme.cyan, false),
            search: makeDrawable(theme.black, theme.lineSoft, 1, null, false)
        };

        var navStyle = new Button.ButtonStyle();
        navStyle.up = d.navUp;
        navStyle.over = d.navOver;
        navStyle.down = d.navDown;
        navStyle.checked = d.navChecked;

        var tileStyle = new Button.ButtonStyle();
        tileStyle.up = d.tileUp;
        tileStyle.over = d.tileOver;
        tileStyle.down = d.tileDown;
        tileStyle.checked = d.tileChecked;

        var iconStyle = new ImageButton.ImageButtonStyle(Styles.defaulti);
        iconStyle.up = d.actionUp;
        iconStyle.over = d.actionOver;
        iconStyle.down = d.actionDown;
        iconStyle.imageUpColor = theme.muted;
        iconStyle.imageOverColor = theme.gold;
        iconStyle.imageDownColor = theme.cyan;

        styles = {
            d: d,
            nav: navStyle,
            tile: tileStyle,
            icon: iconStyle,
            action: copyTextStyle(Styles.defaultt, d.actionUp, d.actionOver, d.actionDown, d.actionOver, Fonts.def, theme.text, theme.gold),
            primary: copyTextStyle(Styles.defaultt, d.primaryUp, d.primaryOver, d.primaryDown, d.primaryDown, Fonts.def, theme.black, theme.black),
            danger: copyTextStyle(Styles.defaultt, d.dangerUp, d.dangerOver, d.dangerDown, d.dangerDown, Fonts.def, theme.red, theme.red),
            tab: copyTextStyle(Styles.defaultt, d.actionUp, d.actionOver, d.actionDown, d.primaryUp, Fonts.def, theme.muted, theme.black),
            label: new Label.LabelStyle(Fonts.def, theme.text),
            labelMuted: new Label.LabelStyle(Fonts.def, theme.muted),
            labelDim: new Label.LabelStyle(Fonts.def, theme.dim),
            labelGold: new Label.LabelStyle(Fonts.def, theme.gold),
            labelCyan: new Label.LabelStyle(Fonts.def, theme.cyan),
            labelRed: new Label.LabelStyle(Fonts.def, theme.red),
            pane: Styles.noBarPane
        };

        return styles;
    }

    function callHandler(name, payload){
        try{
            if(handlers[name] != null){
                handlers[name](payload || {});
            }
        }catch(e){
            Log.err("ModEngineUI handler failed: " + name, e);
        }
    }

    function configure(config){
        if(config == null) return;
        if(config.handlers != null){
            for(var key in config.handlers){
                handlers[key] = config.handlers[key];
            }
        }
    }

    function isCompact(){
        return ArcCore.graphics.getWidth() < 1400;
    }

    function textBlockWidth(maxWidth){
        var available = ArcCore.graphics.getWidth() - (state.compact ? 80 : 520);
        return Math.max(260, Math.min(maxWidth, available));
    }

    function label(text, style, scale, wrap){
        var l = new Label(String(text), style || getStyles().label);
        l.setAlignment(Align.left);
        l.setWrap(wrap === true);
        if(scale != null) l.setFontScale(scale);
        return l;
    }

    function wrappedLabel(text, style, scale){
        return label(text, style, scale, true);
    }

    function getIcon(name, fallback){
        var value = null;
        try{ value = Icon[name]; }catch(e){}
        if(value != null) return value;
        if(fallback != null){
            try{ value = Icon[fallback]; }catch(e){}
            if(value != null) return value;
        }
        try{ return Icon.settings; }catch(e2){ return Tex.whiteui; }
    }

    function iconButton(icon, action){
        var b = new ImageButton(icon, getStyles().icon);
        b.clicked(run(action));
        return b;
    }

    function textButton(text, style, action){
        var b = new TextButton(text, style || getStyles().action);
        b.clicked(run(action));
        return b;
    }

    function inlineNumberField(value, minVal, maxVal, fontColor, onChange){
        var fieldStyle = new TextField.TextFieldStyle(Styles.defaultField);
        fieldStyle.background = null;
        fieldStyle.font = Fonts.def;
        fieldStyle.fontColor = fontColor;

        var field = new TextField(String(Math.round(value)), fieldStyle);
        field.setAlignment(Align.center);
        try{
            field.setTextFieldFilter(new JavaAdapter(Packages.arc.scene.ui.TextField.TextFieldFilter, {
                acceptChar: function(textField, c){
                    return c >= '0' && c <= '9';
                }
            }));
        }catch(eFilter){}

        field.changed(run(function(){
            var raw = String(field.getText());
            if(raw.length === 0) return;
            var num = parseInt(raw, 10);
            if(isNaN(num)) return;
            num = Math.max(minVal, Math.min(maxVal, num));
            if(onChange != null) onChange(num);
        }));

        return field;
    }

    function panel(drawable, pad){
        var t = new Table();
        t.background(drawable || getStyles().d.panel);
        t.margin(pad == null ? gap.lg : pad);
        t.top().left();
        return t;
    }

    function regionDrawable(region){
        if(region == null) return Tex.whiteui;
        return new TextureRegionDrawable(region);
    }

    function eachSeq(seq, fn){
        if(seq == null) return;
        seq.each(cons(function(value){
            fn(value);
        }));
    }

    function visibleContent(content){
        try{
            return content != null && !content.isHidden();
        }catch(e){
            return content != null;
        }
    }

    function contentColor(content, fallback){
        try{
            if(content.color != null) return content.color;
        }catch(e){}
        return fallback || theme.cyan;
    }

    function sectionHeader(title, code, icon){
        var t = new Table();
        t.left();
        if(icon != null){
            t.image(icon).size(28).color(theme.cyan).padRight(gap.md);
        }
        t.add(label(title, getStyles().label, 1.25)).left().growX();
        if(code != null){
            t.add(label(code, getStyles().labelMuted, 0.82)).right();
        }
        return t;
    }

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