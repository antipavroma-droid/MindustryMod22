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