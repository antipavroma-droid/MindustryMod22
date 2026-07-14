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